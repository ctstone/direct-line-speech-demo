import { MemoryStorage } from 'botbuilder';
import { LuisRecognizer } from 'botbuilder-ai';
import DarkSky = require('dark-sky');

import { AzureMap } from './azure-map';

import {
  BOT_SETTINGS,
  DARK_SKY_SETTINGS,
  LUIS_SETTINGS,
  MAP_SETTINGS,
} from './settings';

export function createStorage() {
  return new MemoryStorage();
}

export function createWeatherRecognizer() {
  const { key, region, apps: { weatherAppId } } = LUIS_SETTINGS;
  return new LuisRecognizer({
    applicationId: weatherAppId,
    endpointKey: key,
    endpoint: `https://${region}.api.cognitive.microsoft.com`,
  });
}

export function createAzureMap() {
  const { key } = MAP_SETTINGS;
  return new AzureMap(key);
}

export function createDarkSky() {
  const { key } = DARK_SKY_SETTINGS;
  return new DarkSky(key);
}
