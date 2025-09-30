import { useState, useEffect, useRef, FormEvent } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bot, User, Send, Briefcase, Sparkles, AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { chatService } from '@/lib/chat';
type Message = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
};
type InterviewRole = 'Office Staff' | 'Beauty Host';
export function HomePage() {
  const [role, setRole] = useState<InterviewRole | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [interviewStage, setInterviewStage] = useState<'start' | 'in_progress' | 'finished'>('start');
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (interviewStage === 'start' && messages.length === 0) {
      setMessages([
        {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: "Welcome to AuraHire. I'm your AI-powered interview agent. To begin, please select the role you're applying for from the dropdown menu above.",
        },
      ]);
    }
  }, [interviewStage]);
  useEffect(() => {
    setTimeout(() => {
      if (scrollAreaRef.current) {
        const viewport = scrollAreaRef.current.querySelector('div[data-radix-scroll-area-viewport]');
        if (viewport) {
          viewport.scrollTop = viewport.scrollHeight;
        }
      }
    }, 100);
  }, [messages]);
  const handleRoleSelect = (selectedRole: InterviewRole) => {
    if (interviewStage !== 'start') return;
    setRole(selectedRole);
    setInterviewStage('in_progress');
    setIsLoading(true);
    const startMessage = `I've selected the ${selectedRole} role.`;
    const userMessage: Message = { id: crypto.randomUUID(), role: 'user', content: startMessage };
    let streamingMessage = '';
    const assistantMessageId = crypto.randomUUID();
    setMessages(prev => [...prev, userMessage, { id: assistantMessageId, role: 'assistant', content: '' }]);
    chatService.sendMessage(startMessage, undefined, (chunk) => {
        streamingMessage += chunk;
        setMessages(prev => {
          const newMessages = [...prev];
          const lastMessage = newMessages[newMessages.length - 1];
          if (lastMessage && lastMessage.id === assistantMessageId) {
            lastMessage.content = streamingMessage;
            return newMessages;
          }
          return prev.map(m => m.id === assistantMessageId ? { ...m, content: streamingMessage } : m);
        });
    }).then(() => {
        setIsLoading(false);
        if (streamingMessage.toLowerCase().includes("thank you for your time")) {
            setInterviewStage('finished');
        }
    });
  };
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading || interviewStage !== 'in_progress') return;
    const userMessage: Message = { id: crypto.randomUUID(), role: 'user', content: input };
    setMessages(prev => [...prev, userMessage]);
    const currentInput = input;
    setInput('');
    setIsLoading(true);
    let streamingMessage = '';
    const assistantMessageId = crypto.randomUUID();
    setMessages(prev => [...prev, { id: assistantMessageId, role: 'assistant', content: '' }]);
    await chatService.sendMessage(currentInput, undefined, (chunk) => {
        streamingMessage += chunk;
        setMessages(prev => {
          const newMessages = [...prev];
          const lastMessage = newMessages[newMessages.length - 1];
          if (lastMessage && lastMessage.id === assistantMessageId) {
            lastMessage.content = streamingMessage;
            return newMessages;
          }
          return prev.map(m => m.id === assistantMessageId ? { ...m, content: streamingMessage } : m);
        });
    });
    setIsLoading(false);
    if (streamingMessage.toLowerCase().includes("thank you for your time")) {
        setInterviewStage('finished');
    }
  };
  const handleNewInterview = () => {
    chatService.newSession();
    setRole(null);
    setMessages([]);
    setInput('');
    setIsLoading(false);
    setInterviewStage('start');
  };
  return (
    <main className="min-h-screen bg-slate-100 dark:bg-slate-900 flex flex-col items-center justify-center p-4 font-sans">
      <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_800px_at_50%_200px,#7970e922,transparent)]"></div>
      <Card className="w-full max-w-3xl h-[90vh] flex flex-col shadow-2xl shadow-slate-400/10 z-10 border-slate-200/80 dark:border-slate-800/80 bg-white/80 dark:bg-slate-950/80 backdrop-blur-lg">
        <CardHeader className="text-center border-b dark:border-slate-800 p-4">
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-center gap-2">
            <Sparkles className="w-6 h-6 text-indigo-500" />
            <CardTitle className="text-2xl font-bold text-slate-800 dark:text-slate-100">AuraHire</CardTitle>
          </motion.div>
          <CardDescription className="text-slate-500 dark:text-slate-400">AI-Powered Interview Agent</CardDescription>
        </CardHeader>
        <CardContent className="flex-1 flex flex-col p-0">
          <div className="p-4 border-b dark:border-slate-800">
            <Select onValueChange={handleRoleSelect} disabled={interviewStage !== 'start'}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select Role to Begin Interview..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Office Staff">
                  <div className="flex items-center gap-2"><Briefcase className="w-4 h-4" /> Office Staff</div>
                </SelectItem>
                <SelectItem value="Beauty Host">
                  <div className="flex items-center gap-2"><Sparkles className="w-4 h-4" /> Beauty Host</div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          <ScrollArea className="flex-1" ref={scrollAreaRef}>
            <div className="p-6 space-y-6">
              <AnimatePresence>
                {messages.map((msg, index) => (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.3 }}
                    className={cn('flex items-start gap-3', msg.role === 'user' ? 'justify-end' : 'justify-start')}
                  >
                    {msg.role === 'assistant' && (
                      <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center flex-shrink-0">
                        <Bot className="w-5 h-5 text-slate-500" />
                      </div>
                    )}
                    <div className={cn(
                      'max-w-md rounded-2xl p-3 text-base leading-relaxed',
                      msg.role === 'user'
                        ? 'bg-indigo-600 text-white rounded-br-lg'
                        : 'bg-slate-200 text-slate-800 dark:bg-slate-800 dark:text-slate-200 rounded-bl-lg'
                    )}>
                      <p className="whitespace-pre-wrap">{msg.content}{isLoading && index === messages.length - 1 && msg.role === 'assistant' && <span className="inline-block w-1 h-4 ml-1 bg-slate-500 animate-pulse"></span>}</p>
                    </div>
                    {msg.role === 'user' && (
                      <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center flex-shrink-0">
                        <User className="w-5 h-5 text-white" />
                      </div>
                    )}
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </ScrollArea>
          <CardFooter className="p-4 border-t dark:border-slate-800 flex-col items-stretch gap-4">
            {interviewStage === 'finished' ? (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center gap-2">
                <p className="text-sm text-slate-500 dark:text-slate-400">Interview complete. Thank you!</p>
                <Button onClick={handleNewInterview} className="w-full sm:w-auto transition-all duration-200 hover:bg-indigo-700 bg-indigo-600">
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Start New Interview
                </Button>
              </motion.div>
            ) : (
              <form onSubmit={handleSubmit} className="flex items-center gap-2">
                <Textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit(e); } }}
                  placeholder={interviewStage === 'in_progress' ? 'Type your answer...' : 'Please select a role to start.'}
                  className="flex-1 min-h-[44px] max-h-32 resize-none"
                  rows={1}
                  disabled={isLoading || interviewStage !== 'in_progress'}
                />
                <Button type="submit" size="icon" disabled={!input.trim() || isLoading || interviewStage !== 'in_progress'} className="w-11 h-11 transition-all duration-200 hover:bg-indigo-700 bg-indigo-600">
                  <Send className="w-5 h-5" />
                </Button>
              </form>
            )}
            <div className="flex items-center gap-2 text-xs text-slate-400 dark:text-slate-600 p-2 rounded-lg bg-slate-100 dark:bg-slate-900">
              <AlertTriangle className="w-6 h-6 text-amber-500 flex-shrink-0" />
              <p>
                This is a demo application. To deploy your own version with full AI capabilities, you must configure your own API keys in the backend.
              </p>
            </div>
          </CardFooter>
        </CardContent>
      </Card>
      <footer className="text-center text-sm text-slate-500 dark:text-slate-400 mt-4">
        <p>Built with ❤�� at Cloudflare</p>
      </footer>
    </main>
  );
}