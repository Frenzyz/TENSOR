import { GoogleGenerativeAI } from "@google/generative-ai";
import { createDeepSeekClient } from "@/lib/deepseek-client"; // Import DeepSeek client

const MODEL_NAME = "gemini-1.5-flash";

const geminiClient = (apiKey: string) => {
  if (!apiKey) {
    throw new Error("Gemini API key is required.");
  }
  const genAI = new GoogleGenerativeAI(apiKey);
  return genAI.getGenerativeModel({ model: MODEL_NAME });
};

export const generateFlowchartGemini = async (apiKey: string, promptText: string) => {
  try {
    const model = geminiClient(apiKey);
    const prompt = `
      Generate a flowchart in JSON format based on the following description: "${promptText}".
      The flowchart should represent a logical flow, connecting steps in a sequential or conditional manner.
      Ensure that the nodes and edges in the JSON create a coherent flow of actions or decisions.

      The JSON should contain 'nodes' and 'edges' arrays.
      Each node should have:
        - 'id': A unique identifier for the node (string or number).
        - 'data': An object containing 'label' for the node text.
        - 'position': An object with 'x' and 'y' coordinates for node placement.
        - 'type': (Optional) Node type, such as 'input', 'output', or 'default'. Use 'default' if not specified.

      Each edge should have:
        - 'id': A unique identifier for the edge (string).
        - 'source': The 'id' of the source node.
        - 'target': The 'id' of the target node.

      Example JSON response for a simple process:
      {
        "nodes": [
          {"id": "1", "data": {"label": "Start"}, "position": {"x": 100, "y": 50}, "type": "input"},
          {"id": "2", "data": {"label": "Step 1: Process data"}, "position": {"x": 300, "y": 50}, "type": "default"},
          {"id": "3", "data": {"label": "Decision: Is data valid?"}, "position": {"x": 300, "y": 150}, "type": "default"},
          {"id": "4", "data": {"label": "Step 2A: Handle valid data"}, "position": {"x": 500, "y": 50}, "type": "default"},
          {"id": "5", "data": {"label": "Step 2B: Handle invalid data"}, "position": {"x": 500, "y": 150}, "type": "default"},
          {"id": "6", "data": {"label": "End"}, "position": {"x": 700, "y": 100}, "type": "output"}
        ],
        "edges": [
          {"id": "e1-2", "source": "1", "target": "2"},
          {"id": "e2-3", "source": "2", "target": "3"},
          {"id": "e3-4", "source": "3", "target": "4", "label": "Yes"},
          {"id": "e3-5", "source": "3", "target": "5", "label": "No"},
          {"id": "e4-6", "source": "4", "target": "6"},
          {"id": "e5-6", "source": "5", "target": "6"}
        ]
      }

      Ensure the flowchart is logically structured and easy to follow.
      Respond ONLY with valid JSON, NO markdown code blocks.
    `;

    const result = await model.generateContent(prompt);
    const responseText = result.response.text();
    return responseText;
  } catch (error: any) {
    console.error("Error generating flowchart with Gemini:", error);
    if (error.message.includes('API key not found')) {
      alert('Gemini API key not found. Please ensure you have set your Gemini API key.');
    } else if (error.message.includes('400')) {
      alert('Gemini API request failed due to a bad request. Please check your prompt and API key.');
    } else if (error.message.includes('401')) {
      alert('Gemini API request was unauthorized. Please check your API key.');
    } else {
      alert('Failed to generate flowchart with Gemini. Please check the console for details.');
    }
    return null;
  }
};


export const generateFlowchartSVG = async (apiKey: string, flowchartJSON: string, selectedModel: string) => {
  try {
    let svgString = '';

    if (selectedModel === 'gemini') {
      const model = geminiClient(apiKey);
      const prompt = `
        Generate an SVG string that visually represents the following flowchart JSON.
        The SVG should clearly depict the nodes and edges of the flowchart, making it easy to understand.
        Ensure that node labels are readable and edges are clearly connecting the nodes.

        Flowchart JSON:
        ${flowchartJSON}

        Example SVG structure (provide a simplified example):
        <svg width="500" height="300" xmlns="http://www.w3.org/2000/svg">
          <!-- Define nodes as circles or rectangles and labels as text elements -->
          <rect x="50" y="50" width="100" height="50" stroke="black" fill="white" />
          <text x="100" y="75" text-anchor="middle">Start</text>
          <!-- Define edges as lines or paths with arrows -->
          <line x1="150" y1="75" x2="250" y2="75" stroke="black" />
        </svg>

        Only respond with the SVG string, do not include any explanations or markdown formatting.
      `;

      const result = await model.generateContent(prompt);
      svgString = result.response.text();

    } else if (selectedModel === 'deepseek') {
      const deepseekClient = createDeepSeekClient(apiKey);
      const deepseekPrompt = `
        Generate an SVG string that visually represents the following flowchart JSON.
        The SVG should clearly depict the nodes and edges of the flowchart, using clear visual elements for nodes (like rectangles or circles) and edges (lines with arrows).
        Ensure that node labels are readable and edges are clearly connecting the nodes.
        Make the SVG visually appealing and easy to understand as a flowchart diagram.

        Flowchart JSON:
        ${flowchartJSON}

        Example SVG structure (provide a simplified example - you can improve upon this):
        <svg width="500" height="300" xmlns="http://www.w3.org/2000/svg">
          <!-- Example Node -->
          <rect x="50" y="50" width="120" height="60" rx="10" ry="10" style="fill:#f9f9f9;stroke:#333;stroke-width:1;" />
          <text x="110" y="80" text-anchor="middle" style="font-size: 12px; font-family: sans-serif;">Process Step</text>
          <!-- Example Edge -->
          <path d="M 170 80 L 300 80" stroke="#333" stroke-width="1" marker-end="url(#arrowhead)" />
          <defs>
            <marker id="arrowhead" markerWidth="10" markerHeight="7" orient="auto" refX="0" refY="3.5">
              <polygon points="0 0, 10 3.5, 0 7" fill="#333" />
            </marker>
          </defs>
        </svg>

        Only respond with the SVG string, do not include any explanations or markdown formatting.
      `;

      const response = await deepseekClient.chat.completions.create({
        messages: [{ role: "user", content: deepseekPrompt }],
        model: "deepseek-chat",
      });
      svgString = response.choices[0].message.content || '';
    } else {
      throw new Error(`Model "${selectedModel}" not supported for SVG generation yet.`);
    }

    return svgString;

  } catch (error: any) {
    console.error("Error generating SVG with LLM:", error);
    alert(`Failed to generate SVG with ${selectedModel}. Please check the console for details.`);
    return null;
  }
};
