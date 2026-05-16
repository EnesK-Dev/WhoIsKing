import { api } from './apiClient';

/**
 * Sunucudaki soru havuzu (oyun sırasında sorular SignalR GameStarted ile gelir; bu liste önbellek / tanılama içindir).
 */
export async function requestQuestionsList() {
  return api.get('/api/Question');
}
