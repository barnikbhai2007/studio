'use server';
/**
 * @fileOverview A Genkit flow that validates user guesses for footballer names.
 * It is extremely lenient with misspellings, typos, and partial names.
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
  prompt: `You are an elite football trivia judge. 
Your task is to determine if a user's guess for a footballer's name is correct, even if it has typos or is only a partial name.

Correct Name: "{{{correctName}}}"
User's Guess: "{{{userGuess}}}"

Rules for Validation (Be VERY LENIENT):
1. TYPOS: Accept guesses with missing or wrong letters (e.g., "Sures" for "Suresh", "Leonel" for "Lionel", "Messy" for "Messi").
2. PARTIAL NAMES: Accept single names if they are iconic (e.g., "Klose" for "Miroslav Klose", "Ronaldo" for "Cristiano Ronaldo").
3. PHONETIC: If it sounds like the player, it is CORRECT.
4. ACCENTS: Ignore all special characters and accents.

Is the guess "{{{userGuess}}}" a valid attempt at identifying "{{{correctName}}}"? 
Response MUST be a JSON object with the key "isCorrect".`,
});

const validateAnswerFlow = ai.defineFlow(
  {
    name: 'validateAnswerFlow',
    inputSchema: ValidateAnswerInputSchema,
    outputSchema: ValidateAnswerOutputSchema,
  },
  async (input) => {
    // If exact or very simple match, return true immediately to save tokens
    const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
    const normCorrect = normalize(input.correctName);
    const normGuess = normalize(input.userGuess);
    
    if (normCorrect.includes(normGuess) && normGuess.length > 3) {
      return { isCorrect: true };
    }

    const { output } = await prompt(input);
    if (!output) {
      return { isCorrect: false };
    }
    return output;
  }
);
