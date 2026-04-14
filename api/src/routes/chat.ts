import { Request, Response } from 'express';
import OpenAI from 'openai';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY, // Set this in environment
});

export const chatWithAI = async (req: Request, res: Response) => {
  try {
    const { message, products } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    // Create context with products
    const productsContext = products.map((p: any) =>
      `Name: ${p.name}, Description: ${p.description}, Price: $${p.price}`
    ).join('\n');

    const systemPrompt = `You are a helpful AI assistant for an online cat supply store. You help customers find products they're interested in.

Available products:
${productsContext}

When a customer asks about products, recommend relevant ones from the list above. Be friendly, concise, and helpful. If they ask for something not available, suggest alternatives or say we don't have it.

Respond naturally and engagingly.`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: message }
      ],
      max_tokens: 200,
      temperature: 0.7,
    });

    const aiResponse = completion.choices[0]?.message?.content || 'Sorry, I couldn\'t generate a response.';

    res.json({ response: aiResponse });
  } catch (error) {
    console.error('Chat AI error:', error);
    res.status(500).json({ error: 'Failed to process chat request' });
  }
};