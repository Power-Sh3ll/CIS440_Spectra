// Units Manager - Handles metric/imperial conversions
class UnitsManager {
  constructor() {
    this.currentUnits = 'metric';
    // Don't auto-load settings, wait for auth manager
    window.addEventListener('utilitiesReady', () => {
      // Auth manager will call loadUserUnits when ready
    });
  }

  async loadUserUnits() {
    try {
      const token = localStorage.getItem('jwtToken') || localStorage.getItem('token');
      if (!token) {
        // No token, use default units
        this.currentUnits = 'metric';
        return;
      }

      const response = await fetch('/api/settings', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const settings = await response.json();
        this.currentUnits = settings.units || 'metric';
      } else {
        // Settings not available, use default
        this.currentUnits = 'metric';
      }
    } catch (error) {
      console.warn('Could not load units from settings:', error);
      this.currentUnits = 'metric';
    }
  }

  // Distance conversions
  convertDistance(km, targetUnit = this.currentUnits) {
    if (targetUnit === 'imperial') {
      return {
        value: (km * 0.621371).toFixed(1),
        unit: 'mi',
        fullUnit: 'miles'
      };
    }
    return {
      value: km.toFixed(1),
      unit: 'km',
      fullUnit: 'kilometers'
    };
  }

  // Weight conversions  
  convertWeight(kg, targetUnit = this.currentUnits) {
    if (targetUnit === 'imperial') {
      return {
        value: (kg * 2.20462).toFixed(1),
        unit: 'lb',
        fullUnit: 'pounds'
      };
    }
    return {
      value: kg.toFixed(1),
      unit: 'kg',
      fullUnit: 'kilograms'
    };
  }

  // Temperature conversions
  convertTemperature(celsius, targetUnit = this.currentUnits) {
    if (targetUnit === 'imperial') {
      return {
        value: Math.round((celsius * 9/5) + 32),
        unit: '°F',
        fullUnit: 'Fahrenheit'
      };
    }
    return {
      value: Math.round(celsius),
      unit: '°C',
      fullUnit: 'Celsius'
    };
  }

  // Speed conversions
  convertSpeed(kmh, targetUnit = this.currentUnits) {
    if (targetUnit === 'imperial') {
      return {
        value: (kmh * 0.621371).toFixed(1),
        unit: 'mph',
        fullUnit: 'miles per hour'
      };
    }
    return {
      value: kmh.toFixed(1),
      unit: 'km/h',
      fullUnit: 'kilometers per hour'
    };
  }

  // Format display value with unit
  formatDistance(km) {
    const converted = this.convertDistance(km);
    return `${converted.value} ${converted.unit}`;
  }

  formatWeight(kg) {
    const converted = this.convertWeight(kg);
    return `${converted.value} ${converted.unit}`;
  }

  formatSpeed(kmh) {
    const converted = this.convertSpeed(kmh);
    return `${converted.value} ${converted.unit}`;
  }

  formatTemperature(celsius) {
    const converted = this.convertTemperature(celsius);
    return `${converted.value}${converted.unit}`;
  }

  // Get unit labels for forms/displays
  getDistanceUnit() {
    return this.currentUnits === 'imperial' ? 'mi' : 'km';
  }

  getWeightUnit() {
    return this.currentUnits === 'imperial' ? 'lb' : 'kg';
  }

  getSpeedUnit() {
    return this.currentUnits === 'imperial' ? 'mph' : 'km/h';
  }

  setUnits(units) {
    this.currentUnits = units;
    // Dispatch event for UI updates
    window.dispatchEvent(new CustomEvent('unitsChanged', { 
      detail: { units: units } 
    }));
  }
}

window.unitsManager = new UnitsManager();