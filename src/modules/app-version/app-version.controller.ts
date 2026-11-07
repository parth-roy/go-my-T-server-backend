import { Request, Response } from 'express';
import { logger } from '@shared/logger';

interface AppVersionPolicy {
  appId: string;
  platform: string;
  minVersionCode: number;
  latestVersionCode: number;
  minVersionName: string;
  latestVersionName: string;
  forceUpdate: boolean;
  maxGraceDismissals: number;
  title: string;
  subtitle: string;
  highlights: string[];
  storeUrl: string;
  webUrl: string;
}

const APP_POLICIES: Record<string, {
  packageName: string;
  appName: string;
  minVersionCode: number;
  latestVersionCode: number;
  minVersionName: string;
  latestVersionName: string;
  highlights: string[];
}> = {
  customer: {
    packageName: 'com.gomytruck.customer',
    appName: 'GoMyTruck',
    minVersionCode: 8,
    latestVersionCode: 10,
    minVersionName: '1.0.6',
    latestVersionName: '1.0.8',
    highlights: [
      'Improved security & other enhancements',
      'DFME v2.6 live freight pricing engine',
      'Ultra-fast instant route & distance calculation',
    ],
  },
  driver: {
    packageName: 'com.parther.driver',
    appName: 'GoMyTruck Partner',
    minVersionCode: 8,
    latestVersionCode: 10,
    minVersionName: '1.0.5',
    latestVersionName: '1.0.7',
    highlights: [
      'Improved security & other enhancements',
      'Instant load matching & automated dispatch',
      'Transparent earnings & wallet settlement',
    ],
  },
  workforce: {
    packageName: 'com.gomytruck.workforce',
    appName: 'MetroMitra Workforce',
    minVersionCode: 8,
    latestVersionCode: 9,
    minVersionName: '1.0.6',
    latestVersionName: '1.0.7',
    highlights: [
      'Improved security & other enhancements',
      'Real-time job radar and instant dispatching',
      'Seamless digital attendance & payout tracking',
    ],
  },
};

export class AppVersionController {
  static async checkVersion(req: Request, res: Response) {
    try {
      const appId = String(req.query.appId || 'customer').toLowerCase();
      const platform = String(req.query.platform || 'android').toLowerCase();
      const currentBuild = parseInt(String(req.query.currentBuild || '0'), 10);

      const policyConfig = APP_POLICIES[appId] || APP_POLICIES.customer;

      const packageName = policyConfig.packageName;
      const storeUrl = platform === 'ios'
        ? `https://apps.apple.com/app/id${packageName}`
        : `market://details?id=${packageName}`;
      const webUrl = platform === 'ios'
        ? `https://apps.apple.com/app/id${packageName}`
        : `https://play.google.com/store/apps/details?id=${packageName}`;

      const isOutdated = currentBuild > 0 && currentBuild < policyConfig.latestVersionCode;
      const isCritical = currentBuild > 0 && currentBuild < policyConfig.minVersionCode;

      const responseData: AppVersionPolicy & { isUpdateAvailable: boolean; isCritical: boolean } = {
        appId,
        platform,
        minVersionCode: policyConfig.minVersionCode,
        latestVersionCode: policyConfig.latestVersionCode,
        minVersionName: policyConfig.minVersionName,
        latestVersionName: policyConfig.latestVersionName,
        forceUpdate: isCritical,
        maxGraceDismissals: 2,
        title: 'APP UPDATE REQUIRED',
        subtitle: 'This feature is available only on the latest app version',
        highlights: policyConfig.highlights,
        storeUrl,
        webUrl,
        isUpdateAvailable: isOutdated || isCritical,
        isCritical,
      };

      return res.status(200).json({
        success: true,
        message: 'App version policy fetched',
        data: responseData,
      });
    } catch (err: any) {
      logger.error('[AppVersion] Failed to check version:', err);
      return res.status(500).json({
        success: false,
        message: 'Internal error checking app version',
      });
    }
  }
}
