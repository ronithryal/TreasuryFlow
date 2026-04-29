import React, { useState, useRef, useEffect } from "react";
import { MessageSquare, Send, X, Bot, Sparkles, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { createAgentClient } from "@/services/perplexity";
import { useStore } from "@/store";
import { cn } from "@/lib/cn";

export function AskAI() {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<{ role: "user" | "ai"; content: string }[]>([
    { role: "ai", content: "Hi! I'm the TreasuryFlow Agent. How can I help you with your policies or liquidity today?" }
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  
  const forceMockAi = useStore((s) => s.ui.forceMockAi);
  const policies = useStore((s) => s.policies);
  const accounts = useStore((s) => s.accounts);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  async function handleSend() {
    if (!input.trim() || isLoading) return;
    
    const userMsg = input.trim();
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: userMsg }]);
    setIsLoading(true);

    try {
      const client = createAgentClient(forceMockAi);
      
      // Provide context about the current treasury state
      const context = `
Current Treasury Context:
- Active Policies: ${policies.filter(p => p.status === 'active').map(p => p.name).join(', ')}
- Accounts: ${accounts.map(a => `${a.name} (${a.asset} on ${a.chain}): $${a.balance}`).join('; ')}
- Total Managed: $${accounts.reduce((sum, a) => sum + (a.accountType !== 'bank_destination' ? a.balance : 0), 0).toLocaleString()}
`;

      const response = await client.ask({
        instructions: `You are the TreasuryFlow Assistant, an expert in treasury management, non-custodial policies, and onchain finance. 
Answer the user's question concisely and professionally. Use the provided context to be specific. 
If they ask about a policy, explain its logic (e.g. sweep thresholds).
Keep responses under 100 words.
Context: ${context}`,
        input: userMsg,
      });

      setMessages((prev) => [...prev, { role: "ai", content: response }]);
    } catch (err) {
      setMessages((prev) => [...prev, { role: "ai", content: "Sorry, I encountered an error. Please check your AI settings or try again later." }]);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-4">
      {isOpen && (
        <Card className="w-80 sm:w-96 h-[500px] flex flex-col shadow-2xl border-primary/20 bg-background/95 backdrop-blur-xl animate-in slide-in-from-bottom-4 duration-300">
          <CardHeader className="p-4 border-b flex flex-row items-center justify-between bg-primary/5">
            <CardTitle className="text-sm flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-primary/10">
                <Bot className="h-4 w-4 text-primary" />
              </div>
              Treasury Assistant
            </CardTitle>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setIsOpen(false)}>
              <X className="h-4 w-4" />
            </Button>
          </CardHeader>
          
          <CardContent 
            ref={scrollRef}
            className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-primary/10"
          >
            {messages.map((m, i) => (
              <div 
                key={i} 
                className={cn(
                  "flex flex-col gap-1 max-w-[85%]",
                  m.role === "user" ? "ml-auto items-end" : "mr-auto items-start"
                )}
              >
                <div 
                  className={cn(
                    "px-3 py-2 rounded-2xl text-xs leading-relaxed",
                    m.role === "user" 
                      ? "bg-primary text-primary-foreground rounded-tr-none" 
                      : "bg-muted border border-border/50 rounded-tl-none"
                  )}
                >
                  {m.content}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex items-center gap-2 text-muted-foreground text-[10px] italic">
                <Loader2 className="h-3 w-3 animate-spin" />
                Assistant is thinking...
              </div>
            )}
          </CardContent>

          <CardFooter className="p-4 border-t gap-2 bg-muted/30">
            <Input 
              placeholder="Ask about policies..." 
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
              className="text-xs h-9 bg-background"
            />
            <Button size="icon" className="h-9 w-9 shrink-0" onClick={handleSend} disabled={isLoading}>
              <Send className="h-4 w-4" />
            </Button>
          </CardFooter>
        </Card>
      )}

      <Button
        size="lg"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "rounded-full h-14 w-14 shadow-xl transition-all duration-300",
          isOpen ? "bg-muted text-muted-foreground rotate-90" : "bg-primary text-primary-foreground hover:scale-105"
        )}
      >
        {isOpen ? <X className="h-6 w-6" /> : <MessageSquare className="h-6 w-6" />}
        {!isOpen && (
          <div className="absolute -top-1 -right-1 flex h-4 w-4">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
            <span className="relative inline-flex rounded-full h-4 w-4 bg-primary border-2 border-background"></span>
          </div>
        )}
      </Button>
    </div>
  );
}
