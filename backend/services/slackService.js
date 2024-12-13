import { WebClient } from '@slack/web-api';

let slackClient = null;

export const initializeSlackClient = async () => {
  try {
    const token = process.env.SLACK_BOT_TOKEN;
    if (!token) {
      throw new Error('Missing SLACK_BOT_TOKEN in environment variables');
    }

    const client = new WebClient(token);

    const authResponse = await client.auth.test();
    if (!authResponse.ok) {
      throw new Error('Slack auth test failed');
    }

    console.log('Slack client initialized successfully');
    slackClient = client;
    return slackClient;
  } catch (error) {
    console.error('Slack client initialization error:', error);
    throw error;
  }
};

export const getSlackClient = () => {
  if (!slackClient) {
    throw new Error('Slack client not initialized');
  }
  return slackClient;
};
