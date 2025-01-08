const OpenAI = require('openai');
const axios = require('axios');


exports.handler = async function (context, event, callback) {
  console.log('convoToQAPair: event:', event);
  const objective = `## Objective
You are a helpful assistant who can take an input conversation and extract from it one or more text pairs of customer request and service agent response.
Each request and response should be reworded to include the context necessary to be understood if used in a question-and-answer scenario.
Here is an example of an input conversation and the desired output.\n`;
  const example = `Example Input Conversation
Agent: Hello, this is Mary. How may I help you?
Customer: Hi Mary, this is John. I want to know the location of your New York store.
Agent: Certainly, John. Let me pull that up for you. Here it is. Our Manhattan store is at 54 Madison Avenue.
Customer: OK, great. An another thing: does that store have Valet Parking?
Agent: Yes. Valet parking at that store is available for $25. However, we waive that fee if you buy one or more pairs of shoes during your visit.
Customer: Good to know. Thanks.
Agent: Anything else today?
Customer: No, that's all. Thanks.
Agent: Goodbye and thank you for calling Owl Shoes.
Customer: Goodbye.

Output the request-response pairs as JSON in the following format:
[
  {
    "q": "What is the location of the New York store?",
    "a": "The New York store is located at 54 Madison Avenue."
  },
  {
    "q": "Does the New York store offer valet parking?",
    "a": "Yes, the New York store offers valet parking for $25. The fee is waived if you buy one or more pairs of shoes during your visit."
  }
]`;
  const style = `## Style Guidelines
1. Voice Optimization: The output will be used by a voice assistant, so answers must be brief, clear, and naturally conversational. Avoid any visual or text-based cues like lists or symbols that don’t translate to a voice experience.
2. Friendly & Relatable Tone: Use warm, friendly language as if speaking with a close customer. Make use of light humor or empathy to keep the conversation enjoyable, especially when assisting with last-minute needs.
3. Use commas sparingly in your replies.

## Response Format
Your primary goal is to create responses that are clear, conversational, and easy to understand when spoken aloud. Always consider how the response will sound to the listener.

1. Use natural, conversational language suitable for spoken dialogue. Keep sentences concise and easy to understand when spoken aloud.
2. Avoid using symbols or characters that are difficult to express vocally, including:
   - Quotation marks, parentheses, hyphens, colons, and ellipses
   - Mathematical symbols (+, -, *, /, =)
   - Currency symbols ($, €, £)
   - Percent signs (%)
   - Ampersands (&)
   - Slashes (/)
   - Emojis or emoticons

3. Instead of special characters, use descriptive language. For example:
   - Say "quote" and "end quote" instead of using quotation marks
   - Use "plus," "minus," "multiplied by," and "divided by" for mathematical operations
   - Spell out currencies and percentages (e.g., "20 percent" instead of "20%")

4. Use simple punctuation, primarily periods and commas. Avoid semicolons or complex punctuation structures.

5. For emphasis, use descriptive words or repetition rather than capitalization or special formatting.

6. When listing items, use verbal cues like "first," "second," "third," etc., instead of bullet points or numbers.

7. Spell out abbreviations and acronyms unless they are commonly spoken (like "NASA" or "FBI").

8. If you need to describe a web address or email, say "dot" for periods and "at" for @ symbols.

9. When referring to numbers, spell out small numbers (one through ten) and use numerals for larger numbers.`;

  const aiContext = objective + example + style;

  try {
    const prompt = event.transcript;
    const openai = new OpenAI({ apiKey: context.OPENAI_API_KEY });
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-2024-08-06',
      messages: [{ role: "system", content: aiContext }, { role: "user", content: prompt }],
      temperature: 0,
    });

    const result = response.choices[0].message.content;
    console.log("LLM generated QA pairs:\n", result);
    const qaPairs = JSON.parse(result);
    for (const pair of qaPairs) {
      //const {q, a} = pair;
      console.log("Extracted Q-A pair:", pair);
      const saveResp = await axios.post(`https://${context.KB_SERVER}/saveQueryVector`, pair);
      console.log("saveQueryVector response:", saveResp.data);
    };
    callback(null, { status: 'OK' });
  } catch (error) {
    console.error("Error extracting request-response pairs:", error.response?.data || error.message);
    callback(error);
  }
};