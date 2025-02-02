# AI Solver with Gemini API

A React-based web application that uses Google's Gemini API to provide mathematical tutoring with LaTeX formatting. This project is built on top of the [Multimodal Live API Web Console](https://github.com/google-gemini/multimodal-live-api-web-console).

## How It Works

1. **User Input**
   - Users can ask mathematical questions through text input
   - Support for image uploads (e.g., photos of math problems)

2. **Processing**
   - Text questions are formatted with specific LaTeX rules
   - Images are converted to base64 format
   - Both are sent to Gemini API for processing

3. **Response Handling**
   - Responses are formatted with proper mathematical notation
   - LaTeX is used for all mathematical expressions
   - Structured output with clear problem analysis

## Features

- LaTeX formatting for mathematical expressions
- Support for:
  - Functions and transformations
  - Equations and inequalities
  - Fractions and points
  - Piecewise functions
  - Function properties

## Setup

1. Get your Gemini API key from Google
2. Create a `.env` file in the root directory:
   ```
   REACT_APP_GOOGLE_API_KEY=your_api_key_here
   ```
3. Install dependencies:
   ```
   npm install
   ```
4. Start the application:
   ```
   npm start
   ```

## Technology

- React with TypeScript
- Google's Gemini API
- LaTeX for mathematical formatting

## Credits

This project is built upon the [Multimodal Live API Web Console](https://github.com/google-gemini/multimodal-live-api-web-console) by Google Gemini team.

## License

Apache-2.0 license - See LICENSE file for details
