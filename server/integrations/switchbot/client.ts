import crypto from 'node:crypto';
import { ExternalServiceError } from '@/server/lib/errors';
import { logger } from '@/server/lib/logger';

const BASE_URL = 'https://api.switch-bot.com/v1.1';

interface SwitchBotApiResponse<T> {
  statusCode: number;
  message: string;
  body: T;
}

export interface SwitchBotDeviceListItem {
  deviceId: string;
  deviceName: string;
  deviceType: string;
  hubDeviceId?: string;
}

export interface SwitchBotInfraredRemoteItem {
  deviceId: string;
  deviceName: string;
  remoteType: string;
  hubDeviceId: string;
}

export interface SwitchBotDevicesResponse {
  deviceList: SwitchBotDeviceListItem[];
  infraredRemoteList: SwitchBotInfraredRemoteItem[];
}

function buildAuthHeaders(): Record<string, string> {
  const token = process.env.SWITCHBOT_TOKEN;
  const secret = process.env.SWITCHBOT_SECRET;
  if (!token || !secret) {
    throw new ExternalServiceError('SwitchBotトークンが設定されていません');
  }

  const t = Date.now().toString();
  const nonce = crypto.randomUUID();
  const sign = crypto
    .createHmac('sha256', secret)
    .update(token + t + nonce)
    .digest('base64');

  return {
    Authorization: token,
    sign,
    t,
    nonce,
    'Content-Type': 'application/json',
  };
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  const headers = { ...buildAuthHeaders(), ...(init?.headers ?? {}) };

  try {
    response = await fetch(`${BASE_URL}${path}`, { ...init, headers });
  } catch (err) {
    logger.error({ err, path }, 'switchbot_request_failed');
    throw new ExternalServiceError('SwitchBot APIへの接続に失敗しました');
  }

  if (!response.ok) {
    logger.error({ status: response.status, path }, 'switchbot_http_error');
    throw new ExternalServiceError(`SwitchBot APIがエラーを返しました (HTTP ${response.status})`);
  }

  const json = (await response.json()) as SwitchBotApiResponse<T>;
  if (json.statusCode !== 100) {
    logger.error({ statusCode: json.statusCode, message: json.message, path }, 'switchbot_api_error');
    throw new ExternalServiceError(`SwitchBot API: ${json.message}`);
  }

  return json.body;
}

export function getDevices(): Promise<SwitchBotDevicesResponse> {
  return request<SwitchBotDevicesResponse>('/devices', { method: 'GET' });
}

export async function sendCommand(
  deviceId: string,
  command: string,
  parameter: string = 'default',
  commandType: 'command' | 'customize' = 'command'
): Promise<void> {
  await request(`/devices/${deviceId}/commands`, {
    method: 'POST',
    body: JSON.stringify({ command, parameter, commandType }),
  });
}

export function getDeviceStatus<T>(deviceId: string): Promise<T> {
  return request<T>(`/devices/${deviceId}/status`, { method: 'GET' });
}
