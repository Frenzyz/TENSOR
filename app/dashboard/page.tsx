'use client';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { createDeepSeekClient } from '@/lib/deepseek-client';
import { dashboardSchema } from '@/lib/dashboard-schema';
import { toast } from '@/hooks/use-toast';
import DashboardRenderer from '@/components/dashboard-renderer';

const systemPrompt = `You are a dashboard configuration generator. Respond ONLY with JSON matching this schema:
{
  "ui": [{
    "type": "table|chart|metric|list|form",
    "title": "Component title",
    "dataKey": "reference_to_logic.dataSources.key",
    "config": {}
  }],
  "logic": {
    "dataSources": [{
      "key": "unique_data_key",
      "endpoint": "API endpoint",
      "transform": "optional data transform JS code"
    }],
    "calculations": [{
      "name": "calculation_name",
      "formula": "mathematical formula"
    }]
  }
}`;

export default function DashboardEngine() {
  const [input, setInput] = useState('');
  const [dashboardConfig, setDashboardConfig] = useState<typeof dashboardSchema._output | null>(null);
  const [loading, setLoading] = useState(false);

  const generateDashboard = async () => {
    setLoading(true);
    try {
      const apiKey = process.env.NEXT_PUBLIC_DEEPSEEK_API_KEY;
      if (!apiKey) throw new Error('Deepseek API key not found');
      
      const deepseek = createDeepSeekClient(apiKey);
      const completion = await deepseek.chat.completions.create({
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: input }
        ],
        model: "deepseek-reasoner",
        response_format: { type: "json_object" }
      });

      const content = completion.choices[0].message.content;
      if (!content) {
        throw new Error("No content received from API");
      }

      const rawConfig = JSON.parse(content);
      const validatedConfig = dashboardSchema.parse(rawConfig);
      
      setDashboardConfig(validatedConfig);
      toast({
        title: 'Dashboard Generated',
        description: 'Successfully created adaptive dashboard layout'
      });

    } catch (error) {
      toast({
        title: 'Generation Error',
        description: error instanceof Error ? error.message : 'An unknown error occurred',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-8 space-y-4">
        <h1 className="text-3xl font-bold">Tensor Dashboard Engine</h1>
        <div className="space-y-2">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Describe your dashboard needs (e.g., 'I need a sales dashboard showing monthly revenue trends and regional comparisons')"
            className="h-32"
          />
          <Button 
            onClick={generateDashboard}
            disabled={loading}
          >
            {loading ? 'Generating...' : 'Build Dashboard'}
          </Button>
        </div>
      </div>

      {dashboardConfig && (
        <DashboardRenderer 
          config={dashboardConfig}
          className="border rounded-lg p-4 bg-background"
        />
      )}
    </div>
  );
}
