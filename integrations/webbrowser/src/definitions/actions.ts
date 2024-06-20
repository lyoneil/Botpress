import { z } from '@botpress/sdk'

const captureScreenshot = {
  title: 'Capture Screenshot',
  description: 'Capture a screenshot of the specified page.',
  input: {
    schema: z.object({
      url: z.string(),
    }),
  },
  output: {
    schema: z.object({
      imageUrl: z.string(),
    }),
  },
}

const browsePage = {
  title: 'Browse Page',
  description: 'Extract metadata and content of the specified page as markdown.',
  input: {
    schema: z.object({
      url: z.string(),
    }),
  },
  output: {
    schema: z.object({
      content: z.string(),
      metadata: z.object({
        title: z.string().nullable().optional(),
        description: z.string().nullable().optional(),
        favicon: z.string().nullable().optional(),
        author: z.string().nullable().optional(),
        datePublished: z.string().nullable().optional(),
      }),
    }),
  },
}

const domainNameRegex = /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/i
const domainNameValidator = z
  .string()
  .regex(domainNameRegex, 'Invalid domain name')
  .min(3, 'Invalid URL')
  .max(50, 'Domain name is too long')

const webSearch = {
  title: 'Web Search',
  description: 'Search information on the web.',
  input: {
    schema: z.object({
      query: z.string().min(1).max(1000).describe('What are we searching for?'),
      includeSites: z
        .array(domainNameValidator)
        .max(20)
        .optional()
        .describe('Include only these domains in the search (max 20)'),
      excludeSites: z
        .array(domainNameValidator)
        .max(20)
        .optional()
        .describe('Exclude these domains from the search (max 20)'),
      count: z
        .number()
        .min(1)
        .max(20)
        .optional()
        .default(10)
        .describe('Number of search results to return (default: 10)'),
      freshness: z
        .enum(['Day', 'Week', 'Month'])
        .optional()
        .describe('Only consider results from the last day, week or month'),
    }),
  },
  output: {
    schema: z.object({
      results: z.array(
        z.object({
          name: z.string().describe('Title of the page'),
          url: z.string().describe('URL of the page'),
          snippet: z.string().describe('A short summary of the page'),
          links: z
            .array(z.object({ name: z.string(), url: z.string() }))
            .optional()
            .describe('Useful links on the page'),
        })
      ),
    }),
  },
}

export const actionDefinitions = {
  captureScreenshot,
  browsePage,
  webSearch,
}
