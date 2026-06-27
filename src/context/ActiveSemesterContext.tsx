import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import type { User } from '@supabase/supabase-js';

export interface StudentProfile {
  id: string;
  name: string;
  email?: string;
  birth_date?: string;
  current_grade: number;
  current_class?: number;
  career_wish?: string;
  memo?: string;
  graduation_date?: string;
  is_approved?: boolean;
  is_admin?: boolean;
}

interface ActiveSemesterContextType {
  activeGrade: number;
  activeSemester: number;
  setActiveGrade: (grade: number) => void;
  setActiveSemester: (semester: number) => void;
  user: User | null;
  profile: StudentProfile | null;
  loading: boolean;
  refreshProfile: () => Promise<void>;
  signOut: () => Promise<void>;
}

const ActiveSemesterContext = createContext<ActiveSemesterContextType | undefined>(undefined);

export const ActiveSemesterProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeGrade, setActiveGrade] = useState<number>(1);
  const [activeSemester, setActiveSemester] = useState<number>(1);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const refreshProfile = async () => {
    try {
      const isMock = localStorage.getItem('mock_user_active') === 'true';
      if (isMock) {
        const storedProfile = localStorage.getItem('mock_student_profile');
        if (storedProfile) {
          setProfile(JSON.parse(storedProfile));
        } else {
          const defaultProfile = {
            id: 'mock-user-id',
            name: '김대입',
            email: 'student@example.com',
            birth_date: '2008-03-15',
            current_grade: 1,
            current_class: 3,
            career_wish: '소프트웨어 개발자 / AI 연구원',
            memo: '수학과 컴퓨터 공학에 관심이 많음.',
            graduation_date: '2027-02-15',
            is_approved: true,
            is_admin: true
          };
          localStorage.setItem('mock_student_profile', JSON.stringify(defaultProfile));
          setProfile(defaultProfile);
        }
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setProfile(null);
        return;
      }
      
      const { data, error } = await supabase
        .from('student_profile')
        .select('*')
        .eq('id', user.id)
        .single();
        
      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching profile:', error);
      }
      
      if (data) {
        setProfile(data);
        setActiveGrade(data.current_grade);
      } else {
        setProfile(null);
      }
    } catch (err) {
      console.error('Profile refresh error:', err);
    }
  };

  useEffect(() => {
    const checkAuth = async () => {
      const isMock = localStorage.getItem('mock_user_active') === 'true';
      if (isMock) {
        setUser({
          id: 'mock-user-id',
          email: 'student@example.com',
          created_at: new Date().toISOString(),
          app_metadata: {},
          user_metadata: {},
          aud: 'authenticated',
          role: 'authenticated'
        } as any);
        await refreshProfile();
        setLoading(false);
        return;
      }

      // Initial session check
      try {
        const { data: { session } } = await supabase.auth.getSession();
        setUser(session?.user ?? null);
        if (session?.user) {
          await refreshProfile();
        }
      } catch (e) {
        console.warn('Supabase session fetch failed, falling back to mock check.');
      }
      setLoading(false);
    };

    checkAuth();

    // Auth change listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const isMock = localStorage.getItem('mock_user_active') === 'true';
      if (isMock) return;

      setUser(session?.user ?? null);
      if (session?.user) {
        await refreshProfile();
      } else {
        setProfile(null);
      }
      setLoading(false);
    });

    // Timeout to prevent infinite loading in case session check hangs
    const timer = setTimeout(() => {
      setLoading(false);
    }, 1500);

    return () => {
      subscription.unsubscribe();
      clearTimeout(timer);
    };
  }, []);

  // Update loading state when profile is fetched
  useEffect(() => {
    if (user && profile) {
      setLoading(false);
    }
  }, [user, profile]);

  const signOut = async () => {
    localStorage.removeItem('mock_user_active');
    localStorage.removeItem('mock_student_profile');
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
  };


  return (
    <ActiveSemesterContext.Provider value={{
      activeGrade,
      activeSemester,
      setActiveGrade,
      setActiveSemester,
      user,
      profile,
      loading,
      refreshProfile,
      signOut
    }}>
      {children}
    </ActiveSemesterContext.Provider>
  );
};

export const useActiveSemester = () => {
  const context = useContext(ActiveSemesterContext);
  if (context === undefined) {
    throw new Error('useActiveSemester must be used within an ActiveSemesterProvider');
  }
  return context;
};
