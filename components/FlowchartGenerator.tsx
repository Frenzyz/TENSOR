'use client';

import React, { useState, useCallback, useEffect } from 'react';
import ReactFlow, {
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  Node,
  Edge,
  XYPosition,
  Connection,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { createDeepSeekClient } from '@/lib/deepseek-client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { generateFlowchartGemini } from './gemini'; // Import Gemini function
import { useRouter } from 'next/navigation'; // Import useRouter
import { useForm } from 'react-hook-form';
import { Form, FormControl, FormField, FormItem, FormMessage } from '@/components/ui/form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"


interface FlowchartGeneratorProps { }

const formSchema = z.object({
  api_key: z.string().optional(), // Make API Key optional in schema
});


const FlowchartGenerator: React.FC<FlowchartGeneratorProps> = () => {
  const [nodes, setNodes, onNodesChange] = useNodesState<Node[]>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge[]>([]);
  const [inputPrompt, setInputPrompt] = useState<string>('');
  const [editPrompt, setEditPrompt] = useState<string>(''); // New state for edit prompt
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [llmResponse, setLlmResponse] = useState<string>('');
  const [selectedModel, setSelectedModel] = useState<string>('deepseek');
  const [apiKey, setApiKey] = useState<string>('');
  const [showRawResponse, setShowRawResponse] = useState<boolean>(false); // State for debug dialog
  const { toast } = useToast();
  const router = useRouter(); // Use useRouter for redirection
  const [apiKeySaved, setApiKeySaved] = useState(false);
  const [flowchartName, setFlowchartName] = useState<string>('');
  const [isSaveDialogOpen, setIsSaveDialogOpen] = useState<boolean>(false);
  const [savedFlowcharts, setSavedFlowcharts] = useState<string[]>([]);
  const [isNewFlowchart, setIsNewFlowchart] = useState<boolean>(true); // Track if it's a new flowchart or loaded one


  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      api_key: "",
    },
    mode: "onChange"
  });


  useEffect(() => {
    const storedApiKey = localStorage.getItem(`${selectedModel}_api_key`);
    if (storedApiKey) {
      setApiKey(storedApiKey);
      form.setValue("api_key", storedApiKey); // Also set form value
    } else {
      setApiKey('');
      form.setValue("api_key", ''); // Also clear form value
    }
  }, [selectedModel, form.setValue]);

  useEffect(() => {
    loadFlowchartList();
  }, []);


  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );


  const handleSaveApiKey = async (values: z.infer<typeof formSchema>) => {
    if (!values.api_key) {
      toast({
        title: "Error",
        description: "API key is required",
        variant: "destructive"
      });
      return;
    }
    
    localStorage.setItem(`${selectedModel}_api_key`, values.api_key);
    toast({
      title: "API Key Saved",
      description: `Your ${selectedModel} API key has been saved to local storage.`,
    });
    setApiKey(values.api_key);
    setApiKeySaved(true);
    setTimeout(() => setApiKeySaved(false), 3000);
  };


  const handleModelChange = (model: string) => {
    setSelectedModel(model);
    setApiKey(''); // Clear current API key when model changes, useEffect will handle refilling
    setApiKeySaved(false); // Reset saved state
  };


  const generateFlowchart = async () => {
    if (!inputPrompt && nodes.length === 0) {
      alert('Please enter a description for a new flowchart or load an existing one to edit.');
      return;
    }

    setIsLoading(true);
    setLlmResponse('');
    setShowRawResponse(false); // Close debug dialog on new generation

    let rawResponse = ''; // Declare rawResponse here
    let currentFlowchartJSON = JSON.stringify({ nodes, edges }); // Get current flowchart JSON


    let fullPrompt = '';
    if (nodes.length > 0 && editPrompt) {
      // Edit existing flowchart
      fullPrompt = `
        Current flowchart JSON: ${currentFlowchartJSON}

        Edit instructions: "${editPrompt}"

        Based on the edit instructions, modify the provided flowchart JSON to reflect the changes.
        Ensure the output is still a valid flowchart JSON format, including 'nodes' and 'edges' arrays.
        Maintain the existing structure unless specifically instructed to change it.
        If the edit prompt is unclear, make reasonable assumptions to adjust the flowchart logically.
        Respond ONLY with valid JSON, NO markdown code blocks.
      `;
    } else {
      // Generate new flowchart
      fullPrompt = `
        Generate a flowchart in JSON format based on the following description: "${inputPrompt}".
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
      setNodes([]); // Clear existing nodes and edges for new flowchart
      setEdges([]);
    }


    if (selectedModel === 'deepseek') {
      try {
        const deepseekClient = createDeepSeekClient(apiKey);
        const response = await deepseekClient.chat.completions.create({
          messages: [{ role: "user", content: fullPrompt }],
          model: "deepseek-chat",
        });

        rawResponse = response.choices[0].message.content || '{}';
      } catch (error) {
        console.error('Error generating flowchart with DeepSeek:', error);
        alert('Failed to generate flowchart with DeepSeek. Please try again.');
        setIsLoading(false);
        return; // Exit early if DeepSeek fails
      }
    } else if (selectedModel === 'gemini') {
      try {
        rawResponse = await generateFlowchartGemini(apiKey, fullPrompt) || '{}';
      } catch (error) {
        console.error('Error generating flowchart with Gemini:', error);
        alert('Failed to generate flowchart with Gemini. Please try again.');
        setIsLoading(false);
        return; // Exit early if Gemini fails
      }
    }


    rawResponse = rawResponse.trim();
    // Remove markdown code block delimiters if present
    if (rawResponse.startsWith('```json')) {
      rawResponse = rawResponse.substring(7, rawResponse.length - 3); // Remove ```json and ```
    } else if (rawResponse.startsWith('```')) {
      rawResponse = rawResponse.substring(3, rawResponse.length - 3); // Remove ``` and ``` if no 'json'
    }

    setLlmResponse(rawResponse);

    console.log("Raw LLM Response before parsing:", rawResponse);
    const trimmedResponse = rawResponse.trim();
    console.log("Trimmed LLM Response before parsing:", trimmedResponse);
    console.log("Character codes of trimmed response:", trimmedResponse.charCodeAt(0), trimmedResponse.charCodeAt(1), trimmedResponse.charCodeAt(2), trimmedResponse.charCodeAt(3));

    if (!trimmedResponse) {
      console.error("Trimmed response is empty. Skipping JSON parsing.");
      alert('Failed to generate flowchart. LLM response was empty.');
      setIsLoading(false);
      return;
    }

    try {
      const flowchartData = JSON.parse(trimmedResponse);
      console.log("Flowchart Data from LLM:", flowchartData, "Model:", selectedModel);

      if (flowchartData.nodes && flowchartData.edges) {
        const formattedNodes = flowchartData.nodes.map((node: any) => ({
          id: node.id,
          data: node.data || { label: 'Node' },
          position: node.position || { x: 0, y: 0 },
          type: node.type,
        }));
        console.log("Formatted Nodes:", formattedNodes);
        console.log("Edges:", flowchartData.edges);
        setNodes(formattedNodes);
        setEdges(flowchartData.edges);
      } else {
        console.error('Invalid flowchart data format from LLM:', flowchartData, "Model:", selectedModel);
        alert(`Failed to generate flowchart. Invalid data format from ${selectedModel}: Missing nodes or edges.`);
      }
    } catch (error: unknown) {
      const jsonError = error as Error;
      console.error('JSON parsing error:', jsonError);
      console.error('Raw LLM Response:', rawResponse);
      console.error('Trimmed LLM Response:', trimmedResponse);
      alert(`Failed to parse LLM response as JSON. Please check the raw response (debug button). Error details: ${jsonError.message}`);
    } finally {
      setIsLoading(false);
      setEditPrompt('');
    }
  };


  const handleLogout = async () => {
    setIsLoading(true);
    // No Supabase logout needed if not using Supabase for auth in this component
    router.replace('/login'); // Redirect to login page after logout
    toast({
      title: 'Logout Successful',
      description: 'You have been logged out.'
    });
    setIsLoading(false);
  };


  const handleSaveFlowchart = () => {
    setIsSaveDialogOpen(true);
  };

  const confirmSaveFlowchart = () => {
    if (flowchartName) {
      const existingFlowchartData = localStorage.getItem(`flowchart_${flowchartName}`);
      if (existingFlowchartData) {
        // Save version history
        localStorage.setItem(`flowchart_version_${flowchartName}_previous`, existingFlowchartData);
      }
      localStorage.setItem(`flowchart_${flowchartName}`, JSON.stringify({ nodes, edges }));
      loadFlowchartList(); // Refresh flowchart list after saving
      toast({
        title: "Flowchart Saved",
        description: `Flowchart "${flowchartName}" has been saved.`,
      });
      setIsSaveDialogOpen(false);
      setFlowchartName(''); // Clear input after saving
      setIsNewFlowchart(false); // Mark as not a new flowchart after saving once
    } else {
      alert("Please enter a name for the flowchart.");
    }
  };

  const handleLoadFlowchart = (name: string) => {
    const savedData = localStorage.getItem(`flowchart_${name}`);
    if (savedData) {
      const { nodes: loadedNodes, edges: loadedEdges } = JSON.parse(savedData);
      setNodes(loadedNodes);
      setEdges(loadedEdges);
      setFlowchartName(name); // Set flowchart name when loaded
      setIsNewFlowchart(false); // Mark as not a new flowchart when loaded
      toast({
        title: "Flowchart Loaded",
        description: `Flowchart "${name}" has been loaded.`,
      });
    } else {
      toast({
        title: "Error Loading Flowchart",
        description: `Flowchart "${name}" not found.`,
        variant: "destructive"
      });
    }
  };

  const loadFlowchartList = () => {
    const keys = Object.keys(localStorage);
    const flowchartKeys = keys.filter(key => key.startsWith('flowchart_')).map(key => key.replace('flowchart_', ''));
    setSavedFlowcharts(flowchartKeys);
  };


  return (
    <div className="flex flex-col h-full w-full">
      <Card className="mb-4 w-full" style={{
          top: 'calc(59px + env(safe-area-inset-top, 0px))',
        }}>
        <CardHeader>
          <CardTitle>Tensor Flowchart Generator</CardTitle>
          <CardDescription>Enter a natural language description to generate or edit a flowchart.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <Button 
            onClick={handleLogout} 
            variant="destructive" 
            size="sm" 
            className="absolute top-8 right-4"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <span className="mr-2">Loading...</span>
                {/* You can add a loading spinner here if you have one */}
              </>
            ) : (
              'Logout'
            )}
          </Button>
          <div className="grid gap-2">
            <Label htmlFor="model">Model</Label>
            <Select onValueChange={handleModelChange} defaultValue={selectedModel}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select a model" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="deepseek">DeepSeek</SelectItem>
                <SelectItem value="gemini">Google Gemini</SelectItem>
                <SelectItem value="groq">Groq</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSaveApiKey)} className="space-y-2">
              <FormField
                control={form.control}
                name="api_key"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Input
                        id="api-key"
                        placeholder="Enter your API key"
                        type="password"
                        {...field}
                        disabled={isLoading} // Disable input during loading
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" variant="secondary" className="w-full" disabled={isLoading}> {/* Disable button during loading */}
                Save API Key
                {apiKeySaved && <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-check-circle ml-2"><path d="M22 11.08V12a10 10 0 1 1-22 0c0-9.54 8.38-9.4 9-3 9 0 9 9.4 9 9.4Z"/><path d="m9 12 2 2 4-4"/></svg>}
              </Button>
            </form>
          </Form>


          <div className="grid gap-2">
            <textarea
              className="w-full h-32 p-2 border rounded focus-visible:ring-ring focus-visible:ring-offset-2"
              placeholder="Describe your flowchart..."
              value={inputPrompt}
              onChange={(e) => setInputPrompt(e.target.value)}
              disabled={isLoading} // Disable textarea during loading
            />
          </div>
          {nodes.length > 0 && ( // Conditionally render edit prompt textarea
            <div className="grid gap-2">
              <textarea
                className="w-full h-32 p-2 border rounded focus-visible:ring-ring focus-visible:ring-offset-2"
                placeholder="Describe how to edit the flowchart..."
                value={editPrompt}
                onChange={(e) => setEditPrompt(e.target.value)}
                disabled={isLoading} // Disable textarea during loading
              />
            </div>
          )}
          <button
            className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-md font-semibold px-4 py-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50"
            onClick={generateFlowchart}
            disabled={isLoading}
          >
            {isLoading ? 'Generating...' : (editPrompt ? 'Edit Flowchart' : 'Generate Flowchart')}
          </button>
        </CardContent>
      </Card>

      <Card className="h-full w-full mb-4">
        <CardHeader className="relative">
          <CardTitle>Flowchart</CardTitle>
          <CardDescription>Generated flowchart will be displayed here.</CardDescription>
          <div className="absolute top-2 right-2 flex space-x-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="secondary" size="sm" disabled={isLoading}>
                  Load
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {savedFlowcharts.length > 0 ? (
                  savedFlowcharts.map((name) => (
                    <DropdownMenuItem key={name} onSelect={() => handleLoadFlowchart(name)}>
                      {name}
                    </DropdownMenuItem>
                  ))
                ) : (
                  <DropdownMenuItem disabled>No saved flowcharts</DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
            <Button variant="secondary" size="sm" onClick={handleSaveFlowchart} disabled={isLoading}>
              Save
            </Button>
            <Dialog open={showRawResponse} onOpenChange={setShowRawResponse}>
              <DialogTrigger asChild>
                <Button variant="secondary" size="sm" disabled={isLoading}>
                  Debug
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle>Raw LLM Response</DialogTitle>
                </DialogHeader>
                <div className="overflow-auto">
                  <pre className="bg-muted text-sm rounded-md p-4">
                    <code>{llmResponse}</code>
                  </pre>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent className="h-full" style={{ minHeight: '400px' }}> {/* Ensure CardContent has a minimum height */}
          <div style={{ width: '100%', height: '100%' }}>
            {isLoading ? (
              <div className="flex justify-center items-center h-full">
                <Skeleton className="w-full h-full rounded-md" />
              </div>
            ) : (
              <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onConnect={onConnect}
                fitView
                style={{ backgroundColor: 'white' }} // Optional: set background color for ReactFlow
              >
                <MiniMap />
                <Controls />
                <Background />
              </ReactFlow>
            )}
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={isSaveDialogOpen} onOpenChange={setIsSaveDialogOpen}>
        <AlertDialogTrigger asChild>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Name your flowchart</AlertDialogTitle>
            <AlertDialogDescription>
              Please enter a name to save your flowchart.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label htmlFor="name">Flowchart Name</Label>
              <Input
                id="name"
                placeholder="Flowchart Name"
                value={flowchartName}
                onChange={(e) => setFlowchartName(e.target.value)}
              />
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setIsSaveDialogOpen(false)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmSaveFlowchart}>Save</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default FlowchartGenerator;