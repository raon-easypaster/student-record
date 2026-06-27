const fs = require('fs');
let content = fs.readFileSync('src/services/gemini.ts', 'utf-8');

const helper = `
// Fallback helper to automatically switch models if an API key lacks permissions for a specific tier/region
async function generateContentWithFallback(promptParts, options = {}) {
  const models = ['gemini-1.5-pro', 'gemini-1.5-flash-latest', 'gemini-1.5-flash', 'gemini-pro'];
  let lastError = null;

  for (const modelName of models) {
    try {
      if (!genAI) throw new Error('genAI is not initialized');
      const model = genAI.getGenerativeModel({ model: modelName, ...options });
      return await model.generateContent(promptParts);
    } catch (err) {
      lastError = err;
      if (err.message && (err.message.includes('404') || err.message.includes('not found') || err.message.includes('not supported'))) {
        console.warn(\`[Gemini API] Model \${modelName} returned 404/Not Supported. Trying next fallback model...\`);
        continue;
      }
      throw err;
    }
  }
  throw lastError;
}
`;

content = content.replace(/let genAI: GoogleGenerativeAI \| null = null;[\s\S]+?\}\n/, match => match + "\n" + helper);

// 1. summarizeReferenceMaterial
content = content.replace(/const model = genAI\.getGenerativeModel\(\{ model: 'gemini-1\.5-pro' \}\);\s*const prompt =/g, "const prompt =");
content = content.replace(/const result = await model\.generateContent\(prompt\);/, "const result = await generateContentWithFallback(prompt);");

// 2. The other 4 JSON responses
content = content.replace(/const model = genAI\.getGenerativeModel\(\{[\s\S]*?responseMimeType: "application\/json"[\s\S]*?\}\);\s*const prompt =/g, "const prompt =");

// Replace the next 4 occurrences of model.generateContent(prompt) and model.generateContent([filePart, prompt])
content = content.replace(/const result = await model\.generateContent\(prompt\);/g, "const result = await generateContentWithFallback(prompt, { generationConfig: { responseMimeType: 'application/json' } });");
content = content.replace(/const result = await model\.generateContent\(\[filePart, prompt\]\);/g, "const result = await generateContentWithFallback([filePart, prompt], { generationConfig: { responseMimeType: 'application/json' } });");

fs.writeFileSync('src/services/gemini.ts', content);
console.log('Fixed gemini.ts');
