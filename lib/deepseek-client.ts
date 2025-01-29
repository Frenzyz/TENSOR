import OpenAI from "openai";

export const deepseek = new OpenAI({
  baseURL: 'https://api.deepseek.com',
  apiKey: 'sk-5f60c833eab24fddbe4af26bef01838d'
});
