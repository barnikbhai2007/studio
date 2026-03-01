'use server';
/**
 * @fileOverview A Genkit flow that validates user guesses for footballer names.
 * It allows for common misspellings and abbreviations.
 *
 * - validateAnswer - A function that handles the validation process.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const ValidateAnswerInputSchema = z.object({
  correctName: z.string().describe('The actual name of the footballer.'),
  userGuess: z.string().describe('The name guessed by the user.'),
});

const ValidateAnswerOutputSchema = z.object({
  isCorrect: z.boolean().describe('Whether the guess is close enough to be considered correct.'),
});

export async function validateAnswer(input: { correctName: string; userGuess: string }) {
  return validateAnswerFlow(input);
}

const prompt = ai.definePrompt({
  name: 'validateAnswerPrompt',
  input: { schema: ValidateAnswerInputSchema },
  output: { schema: ValidateAnswerOutputSchema },
  prompt: `You are an expert football trivia judge.
Your task is to determine if a user's guess for a footballer's name is correct, even if there are minor misspellings or common variations.

Correct Name: {{{correctName}}}
User Guess: {{{userGuess}}}

Consider:
1. Minor typos (e.g., "Messy" instead of "Messi").
2. Phonetic similarities (e.g., "Leonel" instead of "Lionel").
3. Common nicknames or identifiers (e.g., "CR7" for "Cristiano Ronaldo").
4. Partial names if they are unique enough (e.g., "Ronaldo" for "Cristiano Ronaldo", but be careful with names like "James" or "Silva").

If the user guess clearly refers to the correct footballer, set isCorrect to true.
Otherwise, set it to false.

Response format MUST be a JSON object with the key "isCorrect".`,
});

const validateAnswerFlow = ai.defineFlow(
  {
    name: 'validateAnswerFlow',
    inputSchema: ValidateAnswerInputSchema,
    outputSchema: ValidateAnswerOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    if (!output) {
      return { isCorrect: false };
    }
    return output;
  }
);
