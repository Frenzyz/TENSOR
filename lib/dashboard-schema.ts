import { z } from "zod";

export const uiComponentSchema = z.object({
  type: z.enum(['table', 'chart', 'metric', 'list', 'form']),
  title: z.string(),
  dataKey: z.string(),
  config: z.record(z.unknown()).optional()
});

export const logicSchema = z.object({
  dataSources: z.array(z.object({
    key: z.string(),
    endpoint: z.string(),
    transform: z.string().optional()
  })),
  calculations: z.array(z.object({
    name: z.string(),
    formula: z.string()
  })).optional()
});

export const dashboardSchema = z.object({
  ui: z.array(uiComponentSchema),
  logic: logicSchema
});
