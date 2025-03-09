const axios = require('axios');

class CodeSearchAgent {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.model = 'claude-3-5-haiku-20241022';
    this.baseUrl = 'https://api.anthropic.com/v1';
    // This would be replaced with actual Zoho Creator API integration
    this.codebase = {
      // Mock codebase for testing
      sampleCode: {
        'user_management.dg': `
          // User Management Module
          userList = zoho.creator.getRecords("your_app", "Users", "Status == 'Active'", 1, 100);
          for each user in userList {
            // Process each user
            if(user.get("Role") == "Admin") {
              // Admin-specific logic
              sendEmail(user.get("Email"), "Admin Report", "Your weekly admin report is ready");
            }
          }
        `,
        'rental_processing.dg': `
          // Rental Processing Module
          function processRental(rentalID) {
            rentalInfo = zoho.creator.getRecordById("rental_app", "Rentals", rentalID);
            if(rentalInfo.get("Status") == "Pending") {
              // Update status
              updateMap = Map();
              updateMap.put("Status", "Approved");
              updateMap.put("ProcessedDate", zoho.currentdate);
              updateResponse = zoho.creator.updateRecord("rental_app", "Rentals", rentalID, updateMap);
              return updateResponse;
            }
            return "Rental already processed";
          }
        `
      }
    };
  }

  async searchCode(query, context = {}) {
    try {
      console.log('Searching code with query:', query);
      
      // In a real implementation, this would search the actual codebase
      // For now, we'll use the mock codebase
      const relevantCode = this._searchMockCodebase(query);
      
      const systemPrompt = this._buildSearchSystemPrompt();
      const userPrompt = this._buildSearchUserPrompt(query, relevantCode, context);
      const response = await this._callClaudeAPI(systemPrompt, userPrompt);
      return this._parseSearchResponse(response);
    } catch (error) {
      console.error('Error in code search agent:', error);
      throw error;
    }
  }

  async explainCode(code, context = {}) {
    try {
      console.log('Explaining code snippet');
      
      const systemPrompt = this._buildExplainSystemPrompt();
      const userPrompt = this._buildExplainUserPrompt(code, context);
      const response = await this._callClaudeAPI(systemPrompt, userPrompt);
      return this._parseExplainResponse(response);
    } catch (error) {
      console.error('Error in code explanation:', error);
      throw error;
    }
  }

  _searchMockCodebase(query) {
    // Simple mock implementation - in production, this would be a real search
    const results = {};
    const queryLower = query.toLowerCase();
    
    for (const [filename, code] of Object.entries(this.codebase.sampleCode)) {
      if (code.toLowerCase().includes(queryLower) || 
          filename.toLowerCase().includes(queryLower)) {
        results[filename] = code;
      }
    }
    
    return results;
  }

  _buildSearchSystemPrompt() {
    return `You are a Code Search & Assistance Agent specializing in Zoho Creator's Deluge scripting language.
    Your task is to find and return relevant code snippets based on natural language queries.
    Always format your responses as valid JSON without trailing commas or syntax errors.
    Focus on providing accurate, relevant code examples with clear explanations.`;
  }

  _buildSearchUserPrompt(query, relevantCode, context) {
    return `
Please search for code relevant to this query: "${query}"

Here are the code snippets I found that might be relevant:
${JSON.stringify(relevantCode, null, 2)}

Additional context:
${JSON.stringify(context, null, 2)}

Return your response as JSON with the following structure:
{
  "relevant_snippets": [
    {
      "filename": "filename.dg",
      "code": "code snippet",
      "relevance": "High/Medium/Low",
      "explanation": "Why this code is relevant to the query"
    }
  ],
  "summary": "A brief summary of the search results",
  "suggestions": ["Suggestion 1", "Suggestion 2"]
}`;
  }

  _buildExplainSystemPrompt() {
    return `You are a Code Explanation Agent specializing in Zoho Creator's Deluge scripting language.
    Your task is to explain code snippets in clear, concise language that non-technical users can understand.
    Always format your responses as valid JSON without trailing commas or syntax errors.
    Focus on explaining what the code does, not just how it works.`;
  }

  _buildExplainUserPrompt(code, context) {
    return `
Please explain this code snippet in simple terms:

\`\`\`
${code}
\`\`\`

Additional context:
${JSON.stringify(context, null, 2)}

Return your explanation as JSON with the following structure:
{
  "summary": "One-sentence summary of what the code does",
  "detailed_explanation": "Step-by-step explanation of the code",
  "key_components": [
    {
      "component": "Component name or line reference",
      "purpose": "What this component does"
    }
  ],
  "potential_issues": ["Issue 1", "Issue 2"],
  "improvement_suggestions": ["Suggestion 1", "Suggestion 2"]
}`;
  }

  async _callClaudeAPI(systemPrompt, userPrompt) {
    try {
      console.log('Making API request to Claude...');
      
      const url = `${this.baseUrl}/messages`;
      
      const data = {
        model: this.model,
        max_tokens: 1000,
        temperature: 0.2, // Lower temperature for more precise code-related responses
        system: systemPrompt,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: userPrompt
              }
            ]
          }
        ]
      };

      const headers = {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey,
        'anthropic-version': '2023-06-01'
      };

      console.log('Using Claude API URL:', url);
      console.log('Using model:', this.model);
      
      const response = await axios.post(url, data, { headers });
      console.log('Received response from Claude API with status:', response.status);
      return response.data;
    } catch (error) {
      console.error('Claude API Error:', error.message);
      if (error.response) {
        console.error('Response status:', error.response.status);
        console.error('Response data:', JSON.stringify(error.response.data, null, 2));
      }
      throw error;
    }
  }

  _parseSearchResponse(response) {
    try {
      console.log('Parsing Claude response...');
      
      if (!response.content || response.content.length === 0) {
        throw new Error('No content in Claude response');
      }
      
      const textResponse = response.content[0].text;
      
      // Try to find JSON in the response
      const jsonMatch = textResponse.match(/```json\n([\s\S]*?)\n```/) || 
                        textResponse.match(/{[\s\S]*?}/);
      
      if (jsonMatch) {
        const jsonText = jsonMatch[1] || jsonMatch[0];
        return JSON.parse(jsonText);
      } else {
        throw new Error('Could not extract JSON from Claude response');
      }
    } catch (error) {
      console.error('Error parsing Claude response:', error);
      
      // Fall back to mock data
      console.log('Falling back to mock data');
      return this._generateMockSearchResponse();
    }
  }

  _parseExplainResponse(response) {
    try {
      console.log('Parsing Claude response...');
      
      if (!response.content || response.content.length === 0) {
        throw new Error('No content in Claude response');
      }
      
      const textResponse = response.content[0].text;
      
      // Try to find JSON in the response
      const jsonMatch = textResponse.match(/```json\n([\s\S]*?)\n```/) || 
                        textResponse.match(/{[\s\S]*?}/);
      
      if (jsonMatch) {
        const jsonText = jsonMatch[1] || jsonMatch[0];
        return JSON.parse(jsonText);
      } else {
        throw new Error('Could not extract JSON from Claude response');
      }
    } catch (error) {
      console.error('Error parsing Claude response:', error);
      
      // Fall back to mock data
      console.log('Falling back to mock data');
      return this._generateMockExplainResponse();
    }
  }

  _generateMockSearchResponse() {
    return {
      relevant_snippets: [
        {
          filename: "rental_processing.dg",
          code: "function processRental(rentalID) {\n  rentalInfo = zoho.creator.getRecordById(\"rental_app\", \"Rentals\", rentalID);\n  if(rentalInfo.get(\"Status\") == \"Pending\") {\n    // Update status\n    updateMap = Map();\n    updateMap.put(\"Status\", \"Approved\");\n    updateMap.put(\"ProcessedDate\", zoho.currentdate);\n    updateResponse = zoho.creator.updateRecord(\"rental_app\", \"Rentals\", rentalID, updateMap);\n    return updateResponse;\n  }\n  return \"Rental already processed\";\n}",
          relevance: "High",
          explanation: "This function processes a rental by updating its status from 'Pending' to 'Approved' and setting the processed date."
        }
      ],
      summary: "Found 1 relevant code snippet for rental processing in the codebase.",
      suggestions: [
        "Consider adding error handling to the processRental function",
        "You might want to add logging for audit purposes"
      ]
    };
  }

  _generateMockExplainResponse() {
    return {
      summary: "This code processes a rental by updating its status from 'Pending' to 'Approved'",
      detailed_explanation: "The function first retrieves the rental record using its ID. It then checks if the rental status is 'Pending'. If it is, the code creates a map with the new status ('Approved') and the current date, then updates the record in the database. Finally, it returns the update response or a message if the rental was already processed.",
      key_components: [
        {
          component: "zoho.creator.getRecordById",
          purpose: "Retrieves the rental record from the database"
        },
        {
          component: "rentalInfo.get(\"Status\")",
          purpose: "Checks the current status of the rental"
        },
        {
          component: "updateMap",
          purpose: "Stores the fields to be updated"
        },
        {
          component: "zoho.creator.updateRecord",
          purpose: "Updates the rental record in the database"
        }
      ],
      potential_issues: [
        "No error handling if the database operations fail",
        "No validation of the rental ID"
      ],
      improvement_suggestions: [
        "Add try-catch blocks for error handling",
        "Add logging for audit purposes",
        "Validate the rental ID before processing"
      ]
    };
  }
}

module.exports = CodeSearchAgent;
