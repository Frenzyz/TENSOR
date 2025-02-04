import OpenAI from "openai";

export const createDeepSeekClient = (apiKey: string) => {
  return new OpenAI({
    baseURL: 'https://api.deepseek.com',
    apiKey: apiKey,
    dangerouslyAllowBrowser: true
  });
};
