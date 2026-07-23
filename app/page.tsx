import { requireUser } from '@/server/lib/requireUser';
import { can } from '@/server/domain/permission/permissionService';
import * as airconService from '@/server/domain/aircon/airconService';
import AirconSummaryCard from './components/AirconSummaryCard';
import LogoutButton from './components/LogoutButton';
import styles from './page.module.css';

export default async function DashboardPage() {
  const user = await requireUser('/');
  const canOperateAircon = can(user, 'aircon.operate');

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
      <div className={styles.header}>
        <h1 className={styles.title}>ホームポータル</h1>
        <LogoutButton />
      </div>

      <section>
        <h2 className={styles.sectionTitle}>エアコン</h2>
        {loadError && <p className={styles.error}>エアコン情報の取得に失敗しました。</p>}
        {!loadError && devices.length === 0 && <p>登録されているエアコンがありません。</p>}
        {!loadError && devices.length > 0 && (
          <div className={styles.grid}>
            {devices.map((device, i) => {
              const state = states[i];
              return (
                <AirconSummaryCard
                  key={device.id}
                  deviceId={device.id}
                  deviceName={device.name}
                  initialPower={state.power}
                  initialTemperature={state.temperature}
                  initialMode={state.mode}
                  canOperate={canOperateAircon}
                />
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}
