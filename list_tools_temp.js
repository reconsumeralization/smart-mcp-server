import { listTools } from './src/registry/index.js';

async function main() {
  const tools = listTools();
  console.log(JSON.stringify(tools, null, 2));
}

main(); 