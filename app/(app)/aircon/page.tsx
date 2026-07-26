import { requireUser } from '@/server/lib/requireUser';
import { can } from '@/server/domain/permission/permissionService';
import * as airconService from '@/server/domain/aircon/airconService';
import AirconControlPanel from './AirconControlPanel';
import styles from './page.module.css';

export default async function AirconPage() {
  const user = await requireUser('/aircon');
  const canOperate = can(user, 'aircon.operate');

  let devices: Awaited<ReturnType<typeof airconService.listDevices>> = [];
  let states: Awaited<ReturnType<typeof airconService.getState>>[] = [];
  let loadError = false;

  try {
    devices = await airconService.listDevices(user);
    states = await Promise.all(devices.map((device) => airconService.getState(user, device.id)));
  } catch {
    loadError = true;
  }

  return (
    <main className={styles.main}>
      <h1 className={styles.title}>エアコン</h1>
      {loadError && <p className={styles.error}>エアコン情報の取得に失敗しました。</p>}
      {!loadError && devices.length === 0 && <p>登録されているエアコンがありません。</p>}
      {!loadError && devices.length > 0 && (
        <div className={styles.grid}>
          {devices.map((device, i) => {
            const state = states[i];
            return (
              <AirconControlPanel
                key={device.id}
                deviceId={device.id}
                deviceName={device.name}
                canOperate={canOperate}
                initialState={{
                  power: state.power,
                  temperature: state.temperature,
                  mode: state.mode,
                  fanSpeed: state.fanSpeed,
                  updatedAt: state.updatedAt.toISOString(),
                  updatedByName: state.updatedBy?.displayName ?? null,
                }}
              />
            );
          })}
        </div>
      )}
    </main>
  );
}
