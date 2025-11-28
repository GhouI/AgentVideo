import { CactusLM, type Message } from 'cactus-react-native';
async function runCactus(){
// Create a new instance
const cactusLM = new CactusLM();
// Download the model
await cactusLM.download({
  onProgress: (progress) => console.log(`Download: ${Math.round(progress * 100)}%`)
});
// Generate a completion
const messages: Message[] = [
  { role: 'user', content: 'What is the capital of France?' }
];
const result = await cactusLM.complete({ messages });
console.log(result.response); // "The capital of France is Paris."
// Clean up resources
await cactusLM.destroy();
return result;
}