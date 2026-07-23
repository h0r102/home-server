import { requireUser } from '@/server/lib/requireUser';
import { can } from '@/server/domain/permission/permissionService';
import * as airconService from '@/server/domain/aircon/airconService';
import * as sensorService from '@/server/domain/sensor/sensorService';
import AirconSummaryCard from './components/AirconSummaryCard';
import SensorSummaryCard from './components/SensorSummaryCard';
import LogoutButton from './components/LogoutButton';
import styles from './page.module.css';

export default async function DashboardPage() {
  const user = await requireUser('/');
  const canOperateAircon = can(user, 'aircon.operate');

  let devices: Awaited<ReturnType<typeof airconService.listDevices>> = [];
  let states: Awaited<ReturnType<typeof airconService.getState>>[] = [];
  let airconLoadError = false;

  try {
    devices = await airconService.listDevices(user);
    states = await Promise.all(devices.map((device) => airconService.getState(user, device.id)));
  } catch {
    airconLoadError = true;
  }

  let sensors: Awaited<ReturnType<typeof sensorService.listLatest>> = [];
  let sensorLoadError = false;

  try {
    sensors = await sensorService.listLatest(user);
  } catch {
    sensorLoadError = true;
  }

  return (
    <main className={styles.main}>
      <div className={styles.header}>
        <h1 className={styles.title}>ホームポータル</h1>
        <LogoutButton />
      </div>

      <section>
        <h2 className={styles.sectionTitle}>エアコン</h2>
        {airconLoadError && <p className={styles.error}>エアコン情報の取得に失敗しました。</p>}
        {!airconLoadError && devices.length === 0 && <p>登録されているエアコンがありません。</p>}
        {!airconLoadError && devices.length > 0 && (
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

      <section>
        <h2 className={styles.sectionTitle}>温湿度</h2>
        {sensorLoadError && <p className={styles.error}>センサー情報の取得に失敗しました。</p>}
        {!sensorLoadError && sensors.length === 0 && <p>登録されている温湿度センサーがありません。</p>}
        {!sensorLoadError && sensors.length > 0 && (
          <div className={styles.grid}>
            {sensors.map((sensor) => (
              <SensorSummaryCard
                key={sensor.deviceId}
                deviceId={sensor.deviceId}
                deviceName={sensor.deviceName}
                temperature={sensor.temperature}
                humidity={sensor.humidity}
                fetchedAt={sensor.fetchedAt}
                fetchOk={sensor.fetchOk}
              />
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
