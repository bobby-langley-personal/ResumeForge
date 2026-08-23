// Shared test fixtures

export const freeUser = {
  id: 'user_test_123',
  email: 'test@example.com',
  subscription_status: 'free' as const,
  tailored_resume_count: 0,
  weekly_resume_count: 0,
  weekly_window_start: null,
  chat_unlocked_count: 0,
  interview_prep_count: 0,
  experience_interview_count: 0,
};

export const proUser = {
  ...freeUser,
  subscription_status: 'pro' as const,
};

export const applicationWithChat = {
  id: 'app_test_abc',
  user_id: 'user_test_123',
  job_title: 'Software Engineer',
  company: 'Acme Corp',
  job_description: 'A great job',
  chat_enabled: true,
  interview_prep: null,
  resume_content: 'NAME: John Doe\nEXPERIENCE:\nAcme | New York\nEngineer | Jan 2022 – Present\n• Built stuff',
};

export const applicationWithoutChat = {
  ...applicationWithChat,
  id: 'app_test_locked',
  chat_enabled: false,
};

export const applicationWithPrep = {
  ...applicationWithChat,
  id: 'app_test_prep',
  interview_prep: { questions: [] },
};

export const baseRequest = {
  company: 'Acme Corp',
  jobTitle: 'Software Engineer',
  jobDescription: 'We need a software engineer with React and Node.js skills.',
  backgroundExperience: 'I have 3 years of React and Node.js experience.',
};

export function makeRequest(body: Record<string, unknown>, headers: Record<string, string> = {}) {
  return new Request('http://localhost/api/test', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(body),
  });
}
