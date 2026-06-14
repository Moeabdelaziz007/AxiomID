import { queryPerplexity } from '@/lib/agents/perplexity';

describe('Perplexity Agent API', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('should return error message when API key is missing', async () => {
    delete process.env.PERPLEXITY_API_KEY;
    const result = await queryPerplexity('test query');
    expect(result.content).toContain('Error: Perplexity API key is not configured');
    expect(result.citations).toEqual([]);
  });

  it('should call fetch and return parsed content when API key is present', async () => {
    process.env.PERPLEXITY_API_KEY = 'test-api-key';

    const mockResponse = {
      choices: [
        {
          message: {
            content: 'Real-time result from Perplexity.',
          },
        },
      ],
      citations: ['https://example.com/source'],
    };

    global.fetch = jest.fn().mockImplementation(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      })
    ) as jest.Mock;

    const result = await queryPerplexity('What is current status?', {
      model: 'sonar',
    });

    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(result.content).toBe('Real-time result from Perplexity.');
    expect(result.citations).toContain('https://example.com/source');
  });

  it('should throw an error on API error response', async () => {
    process.env.PERPLEXITY_API_KEY = 'test-api-key';

    global.fetch = jest.fn().mockImplementation(() =>
      Promise.resolve({
        ok: false,
        status: 500,
        text: () => Promise.resolve('Internal Server Error'),
      })
    ) as jest.Mock;

    await expect(queryPerplexity('Fail me')).rejects.toThrow(
      'Perplexity API HTTP error! Status: 500'
    );
  });
});
