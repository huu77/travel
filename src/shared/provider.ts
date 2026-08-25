import type { IFlightProvider } from '@/types/flight.js';

type ProviderConstructor = new () => IFlightProvider;

export class FlightProviderRegistry {
  private static providers = new Map<string, IFlightProvider>();

  static register(code: string, providerInstance: IFlightProvider) {
    this.providers.set(code.toLowerCase(), providerInstance);
  }

  static get(code: string = 'duffel'): IFlightProvider {
    const provider = this.providers.get(code.toLowerCase());
    if (!provider) {
      throw new Error(`Nhà cung cấp "${code}" chưa được hỗ trợ hoặc chưa đăng ký!`);
    }
    return provider;
  }

  static getAll(): IFlightProvider[] {
    return Array.from(this.providers.values());
  }
}

export function FlightProvider(code: string) {
  return function <T extends ProviderConstructor>(target: T) {
    FlightProviderRegistry.register(code, new target());
  };
}
