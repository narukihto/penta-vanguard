import { arduinoNano } from './arduino_nano'; // Assuming the tscircuit file is named arduino_nano.ts

// Mock getNetlist for testing purposes, as tscircuit-test-utils is not a standard library.
// In a real tscircuit environment, this would be provided by the framework.
function getNetlist(module: any) {
  const netlist: { [netName: string]: string[] } = {};
  for (const connection of module.connections) {
    const netName = connection.netName;
    if (!netlist[netName]) {
      netlist[netName] = [];
    }
    for (const connectedPin of connection.connectedPins) {
      if (typeof connectedPin === 'string') {
        netlist[netName].push(connectedPin);
      } else if (connectedPin.componentId && connectedPin.pinIdentifier) {
        netlist[netName].push(`${connectedPin.componentId}.${connectedPin.pinIdentifier}`);
      }
    }
  }
  return netlist;
}

// Helper to check if a pin is on a specific net
function isPinOnNet(netlist: { [netName: string]: string[] }, pin: string, netName: string): boolean {
  return netlist[netName] && netlist[netName].includes(pin);
}

// Helper to get the net name for a given pin
function getNetNameForPin(netlist: { [netName: string]: string[] }, pin: string): string | undefined {
  for (const netName in netlist) {
    if (netlist[netName].includes(pin)) {
      return netName;
    }
  }
  return undefined;
}

describe('Arduino Nano v3.0 tscircuit implementation', () => {
  let netlist: { [netName: string]: string[] };

  beforeAll(() => {
    netlist = getNetlist(arduinoNano);
  });

  // Assert netlist existence
  it('should generate a netlist', () => {
    expect(netlist).toBeDefined();
    expect(Object.keys(netlist).length).toBeGreaterThan(0);
  });

  // Power-rail continuity checks
  describe('Power Rail Continuity', () => {
    it('VCC_5V net should connect all 5V components', () => {
      const expected5VPins = [
        'U1.VOUT', 'D2.C', 'C2.2', // 5V Regulator output and USB VBUS (after diode)
        'U3.VCC', 'U3.AVCC', 'C5.1', 'C6.1', // ATmega VCC, AVCC, and decoupling caps
        'U4.VCC', 'U4.VCC_16', 'C10.1', // CH340G VCC and decoupling cap
        'R_PWR.1', 'LED_PWR.A', // Power LED
        'H4.5V', 'H5.VCC', // Headers
        'U2.VIN', // Input to 3.3V regulator
        'R1.2', // ATmega Reset pull-up
      ];
      const vcc5vNet = getNetNameForPin(netlist, expected5VPins[0]);
      expect(vcc5vNet).toBe('VCC_5V');
      for (const pin of expected5VPins) {
        expect(isPinOnNet(netlist, pin, 'VCC_5V')).toBe(true);
      }
    });

    it('VCC_3V3 net should connect all 3.3V components', () => {
      const expected3V3Pins = [
        'U2.VOUT', 'C3.1', 'C4.2', // 3.3V Regulator output and caps
        'H4.3V3', // Header
        'R2.2', // USB DP pull-up
      ];
      const vcc3v3Net = getNetNameForPin(netlist, expected3V3Pins[0]);
      expect(vcc3v3Net).toBe('VCC_3V3');
      for (const pin of expected3V3Pins) {
        expect(isPinOnNet(netlist, pin, 'VCC_3V3')).toBe(true);
      }
    });

    it('GND net should connect all ground pins', () => {
      const expectedGNDPins = [
        'U1.GND', 'U2.GND', 'U3.GND', 'U3.AGND', // Regulators and ATmega GNDs
        'U4.GND', // CH340G GND
        'J1.GND', 'J1.SHIELD', // USB connector GND
        'C1.2', 'C2.1', 'C3.2', 'C4.1', 'C5.2', 'C6.2', 'C7.2', 'C8.2', 'C9.2', 'C10.2', 'C11.2', 'C12.2', 'C13.2', // All capacitor grounds
        'R_PWR.2', 'R_TX.2', 'R_RX.2', 'R_L.2', // Resistor grounds
        'LED_PWR.C', 'LED_TX.C', 'LED_RX.C', 'LED_L.C', // LED cathodes
        'SW1.1', 'SW1.3', // Reset button grounds
        'H2.GND', 'H4.GND', 'H5.GND', // Headers
      ];
      const gndNet = getNetNameForPin(netlist, expectedGNDPins[0]);
      expect(gndNet).toBe('GND');
      for (const pin of expectedGNDPins) {
        expect(isPinOnNet(netlist, pin, 'GND')).toBe(true);
      }
    });
  });

  // Validate pin-connectivity for all primary components
  describe('Component Pin Connectivity', () => {
    // ATmega328P (U3)
    it('ATmega328P (U3) power and crystal connections', () => {
      expect(isPinOnNet(netlist, 'U3.VCC', 'VCC_5V')).toBe(true);
      expect(isPinOnNet(netlist, 'U3.AVCC', 'VCC_5V')).toBe(true);
      expect(isPinOnNet(netlist, 'U3.GND', 'GND')).toBe(true);
      expect(isPinOnNet(netlist, 'U3.AGND', 'GND')).toBe(true);
      expect(isPinOnNet(netlist, 'U3.PB6/XTAL1', 'ATMEGA_XTAL1')).toBe(true);
      expect(isPinOnNet(netlist, 'U3.PB7/XTAL2', 'ATMEGA_XTAL2')).toBe(true);
      expect(isPinOnNet(netlist, 'X1.1', 'ATMEGA_XTAL1')).toBe(true);
      expect(isPinOnNet(netlist, 'X1.2', 'ATMEGA_XTAL2')).toBe(true);
      expect(isPinOnNet(netlist, 'C8.1', 'ATMEGA_XTAL1')).toBe(true);
      expect(isPinOnNet(netlist, 'C9.1', 'ATMEGA_XTAL2')).toBe(true);
      expect(isPinOnNet(netlist, 'C8.2', 'GND')).toBe(true);
      expect(isPinOnNet(netlist, 'C9.2', 'GND')).toBe(true);
    });

    it('ATmega328P (U3) reset and UART connections', () => {
      expect(isPinOnNet(netlist, 'U3.PC6/RST', 'ATMEGA_RST')).toBe(true);
      expect(isPinOnNet(netlist, 'R1.1', 'ATMEGA_RST')).toBe(true);
      expect(isPinOnNet(netlist, 'R1.2', 'VCC_5V')).toBe(true); // Reset pull-up
      expect(isPinOnNet(netlist, 'SW1.2', 'ATMEGA_RST')).toBe(true);
      expect(isPinOnNet(netlist, 'C7.1', 'ATMEGA_RST')).toBe(true);
      expect(isPinOnNet(netlist, 'C7.2', 'GND')).toBe(true);
      expect(isPinOnNet(netlist, 'U3.PD0/RXD', 'ATMEGA_RX')).toBe(true);
      expect(isPinOnNet(netlist, 'U3.PD1/TXD', 'ATMEGA_TX')).toBe(true);
    });

    it('ATmega328P (U3) LED_L and header connections', () => {
      expect(isPinOnNet(netlist, 'U3.PD7', 'U3_PD7_PIN')).toBe(true);
      expect(isPinOnNet(netlist, 'R_L.1', 'U3_PD7_PIN')).toBe(true);
      expect(isPinOnNet(netlist, 'LED_L.A', 'LED_L_ANODE')).toBe(true);
      expect(isPinOnNet(netlist, 'LED_L.C', 'GND')).toBe(true);
      expect(isPinOnNet(netlist, 'H1.D7', 'U3_PD7_PIN')).toBe(true); // D7 header
      expect(isPinOnNet(netlist, 'H1.D0', 'U3_PD0_HEADER')).toBe(true);
      expect(isPinOnNet(netlist, 'H1.D1', 'U3_PD1_HEADER')).toBe(true);
      expect(isPinOnNet(netlist, 'H2.D13', 'U3.PB5/SCK')).toBe(true); // D13 header
      expect(isPinOnNet(netlist, 'H3.A0', 'U3.PC0/A0')).toBe(true); // A0 header
      expect(isPinOnNet(netlist, 'H4.AREF', 'U3.AREF')).toBe(true); // AREF header
      expect(isPinOnNet(netlist, 'H5.MISO', 'U3.PB4/MISO')).toBe(true); // ICSP MISO
    });

    // CH340G (U4)
    it('CH340G (U4) power, crystal, and USB connections', () => {
      expect(isPinOnNet(netlist, 'U4.VCC', 'VCC_5V')).toBe(true);
      expect(isPinOnNet(netlist, 'U4.VCC_16', 'VCC_5V')).toBe(true);
      expect(isPinOnNet(netlist, 'U4.GND', 'GND')).toBe(true);
      expect(isPinOnNet(netlist, 'C10.1', 'VCC_5V')).toBe(true);
      expect(isPinOnNet(netlist, 'U4.XI', 'CH340_XTAL1')).toBe(true);
      expect(isPinOnNet(netlist, 'U4.XO', 'CH340_XTAL2')).toBe(true);
      expect(isPinOnNet(netlist, 'X2.1', 'CH340_XTAL1')).toBe(true);
      expect(isPinOnNet(netlist, 'X2.2', 'CH340_XTAL2')).toBe(true);
      expect(isPinOnNet(netlist, 'C12.1', 'CH340_XTAL1')).toBe(true);
      expect(isPinOnNet(netlist, 'C13.1', 'CH340_XTAL2')).toBe(true);
      expect(isPinOnNet(netlist, 'C12.2', 'GND')).toBe(true);
      expect(isPinOnNet(netlist, 'C13.2', 'GND')).toBe(true);
      expect(isPinOnNet(netlist, 'U4.USB_DP', 'USB_DP')).toBe(true);
      expect(isPinOnNet(netlist, 'U4.USB_DM', 'USB_DM')).toBe(true);
      expect(isPinOnNet(netlist, 'J1.DP', 'USB_DP')).toBe(true);
      expect(isPinOnNet(netlist, 'J1.DM', 'USB_DM')).toBe(true);
      expect(isPinOnNet(netlist, 'R2.1', 'USB_DP')).toBe(true);
      expect(isPinOnNet(netlist, 'R2.2', 'VCC_3V3')).toBe(true); // USB DP pull-up
      expect(isPinOnNet(netlist, 'U4.V3', 'CH340_V3_DECOUPLE')).toBe(true);
      expect(isPinOnNet(netlist, 'C11.1', 'CH340_V3_DECOUPLE')).toBe(true);
    });

    it('CH340G (U4) UART and DTR connections', () => {
      expect(isPinOnNet(netlist, 'U4.TXD', 'CH340_TX')).toBe(true);
      expect(isPinOnNet(netlist, 'U4.RXD', 'CH340_RX')).toBe(true);
      expect(isPinOnNet(netlist, 'U3.PD0/RXD', 'CH340_TX')).toBe(true); // ATmega RXD to CH340G TXD
      expect(isPinOnNet(netlist, 'U3.PD1/TXD', 'CH340_RX')).toBe(true); // ATmega TXD to CH340G RXD
      expect(isPinOnNet(netlist, 'U4.DTR#', 'CH340_DTR')).toBe(true);
      expect(isPinOnNet(netlist, 'C7.1', 'CH340_DTR')).toBe(true); // DTR to ATmega Reset via C7
    });

    // AMS1117-5.0 (U1)
    it('AMS1117-5.0 (U1) connections', () => {
      expect(isPinOnNet(netlist, 'U1.VIN', 'VIN_REG_IN')).toBe(true);
      expect(isPinOnNet(netlist, 'U1.VOUT', 'VCC_5V')).toBe(true);
      expect(isPinOnNet(netlist, 'U1.GND', 'GND')).toBe(true);
      expect(isPinOnNet(netlist, 'D1.C', 'VIN_REG_IN')).toBe(true); // D1 output to U1 input
      expect(isPinOnNet(netlist, 'C1.1', 'VIN_REG_IN')).toBe(true); // U1 input cap
      expect(isPinOnNet(netlist, 'C2.2', 'VCC_5V')).toBe(true); // U1 output cap
    });

    // AMS1117-3.3 (U2)
    it('AMS1117-3.3 (U2) connections', () => {
      expect(isPinOnNet(netlist, 'U2.VIN', 'VCC_5V')).toBe(true);
      expect(isPinOnNet(netlist, 'U2.VOUT', 'VCC_3V3')).toBe(true);
      expect(isPinOnNet(netlist, 'U2.GND', 'GND')).toBe(true);
      expect(isPinOnNet(netlist, 'C3.1', 'VCC_3V3')).toBe(true); // U2 input cap
      expect(isPinOnNet(netlist, 'C4.2', 'VCC_3V3')).toBe(true); // U2 output cap
    });

    // USB Mini-B (J1)
    it('USB Mini-B (J1) connections', () => {
      expect(isPinOnNet(netlist, 'J1.VBUS', 'USB_VBUS')).toBe(true);
      expect(isPinOnNet(netlist, 'J1.DP', 'USB_DP')).toBe(true);
      expect(isPinOnNet(netlist, 'J1.DM', 'USB_DM')).toBe(true);
      expect(isPinOnNet(netlist, 'J1.GND', 'GND')).toBe(true);
      expect(isPinOnNet(netlist, 'D2.A', 'USB_VBUS')).toBe(true); // D2 input from J1 VBUS
    });

    // Reset Button (SW1)
    it('Reset Button (SW1) connections', () => {
      expect(isPinOnNet(netlist, 'SW1.2', 'ATMEGA_RST')).toBe(true);
      expect(isPinOnNet(netlist, 'SW1.4', 'ATMEGA_RST')).toBe(true);
      expect(isPinOnNet(netlist, 'SW1.1', 'GND')).toBe(true);
      expect(isPinOnNet(netlist, 'SW1.3', 'GND')).toBe(true);
    });

    // LEDs
    it('LEDs and their resistors are correctly connected', () => {
      expect(isPinOnNet(netlist, 'LED_PWR.A', 'VCC_5V')).toBe(true);
      expect(isPinOnNet(netlist, 'R_PWR.1', 'VCC_5V')).toBe(true);
      expect(isPinOnNet(netlist, 'R_PWR.2', 'GND')).toBe(true);
      expect(isPinOnNet(netlist, 'LED_PWR.C', 'GND')).toBe(true);

      expect(isPinOnNet(netlist, 'LED_TX.A', 'LED_TX_ANODE')).toBe(true);
      expect(isPinOnNet(netlist, 'R_TX.1', 'U4_TXD_LED_DRIVE')).toBe(true);
      expect(isPinOnNet(netlist, 'R_TX.2', 'LED_TX_ANODE')).toBe(true); // Resistor between LED and drive pin
      expect(isPinOnNet(netlist, 'LED_TX.C', 'GND')).toBe(true);
      expect(isPinOnNet(netlist, 'U4.TXD', 'U4_TXD_LED_DRIVE')).toBe(true);

      expect(isPinOnNet(netlist, 'LED_RX.A', 'LED_RX_ANODE')).toBe(true);
      expect(isPinOnNet(netlist, 'R_RX.1', 'U4_RXD_LED_DRIVE')).toBe(true);
      expect(isPinOnNet(netlist, 'R_RX.2', 'LED_RX_ANODE')).toBe(true); // Resistor between LED and drive pin
      expect(isPinOnNet(netlist, 'LED_RX.C', 'GND')).toBe(true);
      expect(isPinOnNet(netlist, 'U4.RXD', 'U4_RXD_LED_DRIVE')).toBe(true);

      expect(isPinOnNet(netlist, 'LED_L.A', 'LED_L_ANODE')).toBe(true);
      expect(isPinOnNet(netlist, 'R_L.1', 'U3_PD7_PIN')).toBe(true);
      expect(isPinOnNet(netlist, 'R_L.2', 'LED_L_ANODE')).toBe(true); // Resistor between LED and drive pin
      expect(isPinOnNet(netlist, 'LED_L.C', 'GND')).toBe(true);
      expect(isPinOnNet(netlist, 'U3.PD7', 'U3_PD7_PIN')).toBe(true);
    });

    // Headers
    it('All header pins are connected to their respective nets', () => {
      expect(isPinOnNet(netlist, 'H1.D0', 'U3_PD0_HEADER')).toBe(true);
      expect(isPinOnNet(netlist, 'H1.D7', 'U3_PD7_PIN')).toBe(true);
      expect(isPinOnNet(netlist, 'H2.RST', 'ATMEGA_RST')).toBe(true);
      expect(isPinOnNet(netlist, 'H2.GND', 'GND')).toBe(true);
      expect(isPinOnNet(netlist, 'H2.D8', 'U3_PB0')).toBe(true);
      expect(isPinOnNet(netlist, 'H2.D13', 'U3.PB5/SCK')).toBe(true);
      expect(isPinOnNet(netlist, 'H3.A0', 'U3.PC0/A0')).toBe(true);
      expect(isPinOnNet(netlist, 'H3.A7', 'U3.ADC7/A7')).toBe(true);
      expect(isPinOnNet(netlist, 'H4.VIN', 'VIN_RAW')).toBe(true);
      expect(isPinOnNet(netlist, 'H4.5V', 'VCC_5V')).toBe(true);
      expect(isPinOnNet(netlist, 'H4.3V3', 'VCC_3V3')).toBe(true);
      expect(isPinOnNet(netlist, 'H5.MISO', 'U3.PB4/MISO')).toBe(true);
      expect(isPinOnNet(netlist, 'H5.VCC', 'VCC_5V')).toBe(true);
      expect(isPinOnNet(netlist, 'H5.GND', 'GND')).toBe(true);
    });
  });
});