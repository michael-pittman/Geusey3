/**
 * API utility functions for consistent fetch configuration and response handling
 * Eliminates duplicate code between chat functions while maintaining identical behavior
 */

/**
 * Error types for API operations
 */
export const API_ERROR_TYPES = {
    NETWORK: 'NETWORK_ERROR',
    CORS: 'CORS_ERROR',
    HTTP: 'HTTP_ERROR',
    PARSE: 'PARSE_ERROR',
    EMPTY_RESPONSE: 'EMPTY_RESPONSE'
};

/**
 * Creates standardized fetch configuration for API requests
 * @param {Object} body - Request body to be JSON stringified
 * @returns {Object} Fetch configuration object
 */
export function createFetchConfig(body) {
    return {
        method: 'POST',
        mode: 'cors',
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        },
        body: JSON.stringify(body)
    };
}

/**
 * Handles API response with unified JSON parsing and validation
 * @param {Response} response - Fetch response object
 * @returns {Promise<Object>} Parsed response data
 * @throws {Error} Various error types based on failure mode
 */
export async function handleApiResponse(response) {
    // Check HTTP status
    if (!response.ok) {
        const error = new Error(`HTTP error! status: ${response.status}`);
        error.type = API_ERROR_TYPES.HTTP;
        error.status = response.status;
        throw error;
    }

    // Get response text first to handle empty responses
    const responseText = await response.text();

    // Handle empty response
    if (!responseText.trim()) {
        const error = new Error('Empty response from server');
        error.type = API_ERROR_TYPES.EMPTY_RESPONSE;
        error.responseText = responseText;
        throw error;
    }

    // Parse JSON with error handling
    let data;
    try {
        data = JSON.parse(responseText);
    } catch (parseError) {
        const error = new Error('Failed to parse JSON response');
        error.type = API_ERROR_TYPES.PARSE;
        error.originalError = parseError;
        error.responseText = responseText;
        throw error;
    }

    return data;
}

/**
 * Generates user-friendly error messages based on error type
 * @param {Error} error - The error object from API operations
 * @param {string} context - Context for the error (e.g., 'sending message', 'loading session')
 * @returns {string} User-friendly error message
 */
export function getErrorMessage(error, context = 'operation') {
    // Handle network-related errors
    if (error.name === 'TypeError' && error.message.includes('CORS')) {
        return '🌐 Can\'t reach server! Check internet? ✨';
    }

    if (error.name === 'TypeError' && error.message.includes('fetch')) {
        return '🚀 Spaceship offline! Check internet connection! 🛸';
    }

    // Handle specific API error types
    switch (error.type) {
        case API_ERROR_TYPES.EMPTY_RESPONSE:
            if (context === 'sending message') {
                return '📭 Empty reply! Try again? 📮';
            }
            return '📦 Empty package! Shake and retry? 🎁';

        case API_ERROR_TYPES.PARSE:
            if (context === 'sending message') {
                return '🤔 Server speaks gibberish! Try again? 🗣️';
            }
            return '🔤 Server riddles! Decoding... try again! 🧩';

        case API_ERROR_TYPES.HTTP:
            return `🤖 Robot hiccup (${error.status})! Gentle poke? 🔧`;

        case API_ERROR_TYPES.NETWORK:
        case API_ERROR_TYPES.CORS:
            return '🌈 Wobbly bridge! Check internet connection! 🌉';

        default:
            if (context === 'sending message') {
                return '😅 Oopsie! Message sending failed! Try again? 💌';
            }
            return '🎪 Digital circus glitch! Try trick again? 🎭';
    }
}

/**
 * Centralized API call wrapper with consistent error handling
 * @param {string} url - API endpoint URL
 * @param {Object} requestBody - Request payload
 * @param {string} context - Context for error messages
 * @returns {Promise<Object>} API response data
 */
export async function makeApiCall(url, requestBody, context = 'operation') {
    try {
        const config = createFetchConfig(requestBody);
        const response = await fetch(url, config);
        const data = await handleApiResponse(response);
        return data;
    } catch (error) {
        // Re-throw with context for caller to handle
        error.context = context;
        throw error;
    }
}