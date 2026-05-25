import * as t from 'tscircuit';

// Fabrication Note: This module defines the Arduino Nano v3.0 equivalent circuit.
// It uses common SMD components for a compact design suitable for automated assembly.
// Component values are typical and may require fine-tuning based on specific manufacturer datasheets.

export const arduinoNano = t.module({
  name: 'Arduino Nano v3.0',
  // Fabrication Note: Board dimensions and mounting holes are not explicitly defined in tscircuit modules,
  // but would be critical for PCB layout. Assume standard Nano form factor.
  // All components are placed on the top layer unless specified.
  
  // Nets Declaration
  nets: {
    VCC_5V: '5V power rail',
    VCC_3V3: '3.3V power rail',
    GND: 'Ground reference',
    VIN_RAW: 'External input voltage (7-12V) from header',
    VIN_REG_IN: 'Input to 5V regulator (VIN after protection diode)',
    USB_VBUS: 'USB 5V power from connector',
    USB_DP: 'USB Data Plus',
    USB_DM: 'USB Data Minus',
    ATMEGA_RST: 'ATmega328P Reset line',
    CH340_TX: 'CH340G Transmit to ATmega RX',
    CH340_RX: 'CH340G Receive from ATmega TX',
    CH340_DTR: 'CH340G DTR# output for ATmega Reset',
    ATMEGA_XTAL1: 'ATmega Crystal Pin 1',
    ATMEGA_XTAL2: 'ATmega Crystal Pin 2',
    CH340_XTAL1: 'CH340G Crystal Pin 1',
    CH340_XTAL2: 'CH340G Crystal Pin 2',
    USB_DP_PULLUP: 'USB DP pull-up net',
    LED_L_ANODE: 'Pin 13 LED anode net',
    LED_TX_ANODE: 'TX LED anode net',
    LED_RX_ANODE: 'RX LED anode net',
    CH340_V3_DECOUPLE: 'CH340G internal 3.3V output decoupling',
  },

  // Components
  components: {
    // --- Power Management ---
    // D1 for VIN reverse polarity protection
    D1: t.diode({
      name: 'D1',
      package: 'sod123',
      value: 'SS14', // Production-grade Schottky diode for lower voltage drop
      // Fabrication Note: Place D1 close to VIN input.
    }),
    // D2 for USB VBUS protection/OR-ing
    D2: t.diode({
      name: 'D2',
      package: 'sod123',
      value: 'SS14', // Production-grade Schottky diode for lower voltage drop
      // Fabrication Note: Place D2 close to USB connector.
    }),

    // AMS1117-5.0V Regulator
    U1: t.custom.component({
      name: 'AMS1117-5.0',
      package: 'sot223',
      pin_labels: {
        '1': 'GND',
        '2': 'VOUT',
        '3': 'VIN',
      },
      // Fabrication Note: Ensure adequate copper pour for heat dissipation on U1.
      // Input and output capacitors are critical for stability.
    }),
    C1: t.capacitor({ name: 'C1', package: 'capacitor_0805', value: '10uF' }), // U1 Input Cap
    C2: t.capacitor({ name: 'C2', package: 'capacitor_0805', value: '10uF' }), // U1 Output Cap

    // AMS1117-3.3V Regulator (derived from 5V rail)
    U2: t.custom.component({
      name: 'AMS1117-3.3',
      package: 'sot223',
      pin_labels: {
        '1': 'GND',
        '2': 'VOUT',
        '3': 'VIN',
      },
      // Fabrication Note: Ensure adequate copper pour for heat dissipation on U2.
    }),
    C3: t.capacitor({ name: 'C3', package: 'capacitor_0805', value: '10uF' }), // U2 Input Cap
    C4: t.capacitor({ name: 'C4', package: 'capacitor_0805', value: '10uF' }), // U2 Output Cap

    // --- ATmega328P Microcontroller ---
    U3: t.custom.component({
      name: 'ATmega328P-AU', // TQFP-32 package
      package: 'qfp32',
      pin_labels: {
        '1': 'PC6/RST', '2': 'PD0/RXD', '3': 'PD1/TXD', '4': 'PD2', '5': 'PD3',
        '6': 'PD4', '7': 'VCC', '8': 'GND', '9': 'PB6/XTAL1', '10': 'PB7/XTAL2',
        '11': 'PD5', '12': 'PD6', '13': 'PD7', '14': 'PB0', '15': 'PB1',
        '16': 'PB2/SS', '17': 'PB3/MOSI', '18': 'PB4/MISO', '19': 'PB5/SCK', '20': 'AVCC',
        '21': 'AREF', '22': 'AGND',
        '23': 'PC0/A0', '24': 'PC1/A1', '25': 'PC2/A2', '26': 'PC3/A3',
        '27': 'PC4/A4/SDA', '28': 'PC5/A5/SCL', '29': 'ADC6/A6', '30': 'ADC7/A7',
      },
      // Fabrication Note: Place U3 centrally with good access for routing to headers and ICSP.
      // Decoupling capacitors (C5, C6) must be placed as close as possible to VCC/GND pins.
    }),
    C5: t.capacitor({ name: 'C5', package: 'capacitor_0805', value: '0.1uF' }), // U3 VCC Decoupling
    C6: t.capacitor({ name: 'C6', package: 'capacitor_0805', value: '0.1uF' }), // U3 AVCC Decoupling
    R1: t.resistor({ name: 'R1', package: 'resistor_0805', value: '10k' }), // ATmega Reset Pull-up
    C7: t.capacitor({ name: 'C7', package: 'capacitor_0805', value: '0.1uF' }), // ATmega Reset Cap for DTR

    // 16MHz Crystal for ATmega328P
    X1: t.crystal({ name: 'X1', package: 'crystal_smd_3225', value: '16MHz' }),
    C8: t.capacitor({ name: 'C8', package: 'capacitor_0603', value: '22pF' }), // X1 Load Cap 1
    C9: t.capacitor({ name: 'C9', package: 'capacitor_0603', value: '22pF' }), // X1 Load Cap 2
    // Fabrication Note: Place X1 and its load capacitors (C8, C9) very close to U3's XTAL pins.
    // Keep traces short and symmetrical.

    // --- CH340G USB-to-Serial Converter ---
    U4: t.custom.component({
      name: 'CH340G',
      package: 'soic16',
      pin_labels: {
        '1': 'DTR#', '2': 'RTS#', '3': 'VCC', '4': 'TXD', '5': 'RXD', '6': 'V3', '7': 'GND', '8': 'XI',
        '9': 'XO', '10': 'NC', '11': 'NC', '12': 'NC', '13': 'NC', '14': 'USB_DM', '15': 'USB_DP', '16': 'VCC_16',
      },
      // Fabrication Note: Place U4 near the USB connector and ATmega328P for short data lines.
    }),
    C10: t.capacitor({ name: 'C10', package: 'capacitor_0805', value: '0.1uF' }), // U4 VCC Decoupling
    C11: t.capacitor({ name: 'C11', package: 'capacitor_0805', value: '0.1uF' }), // U4 V3 Decoupling (internal 3.3V output)

    // 12MHz Crystal for CH340G
    X2: t.crystal({ name: 'X2', package: 'crystal_smd_3225', value: '12MHz' }),
    C12: t.capacitor({ name: 'C12', package: 'capacitor_0603', value: '22pF' }), // X2 Load Cap 1
    C13: t.capacitor({ name: 'C13', package: 'capacitor_0603', value: '22pF' }), // X2 Load Cap 2
    // Fabrication Note: Place X2 and its load capacitors (C12, C13) very close to U4's XI/XO pins.

    // --- USB Connector ---
    J1: t.custom.component({
      name: 'USB_MINI_B',
      package: 'usb_mini_b_smd',
      pin_labels: {
        '1': 'VBUS', '2': 'DM', '3': 'DP', '4': 'ID', '5': 'GND',
        'S1': 'SHIELD', 'S2': 'SHIELD', 'S3': 'SHIELD', 'S4': 'SHIELD', // Shield pins
      },
      // Fabrication Note: J1 requires robust mechanical mounting. Ensure proper pad sizes for SMD.
      // USB data lines (DP/DM) should be routed as a differential pair with controlled impedance.
    }),
    R2: t.resistor({ name: 'R2', package: 'resistor_0805', value: '1.5k' }), // USB DP pull-up (for CH340G)

    // --- Reset Button ---
    SW1: t.button({
      name: 'RESET_BTN',
      package: 'tactile_switch_smd_4pin',
      // Fabrication Note: Ensure sufficient clearance around the button for user access.
    }),

    // --- LEDs ---
    LED_PWR: t.led({ name: 'LED_PWR', package: 'led_0805', color: 'red' }),
    R_PWR: t.resistor({ name: 'R_PWR', package: 'resistor_0805', value: '1k' }), // Power LED current limit

    LED_TX: t.led({ name: 'LED_TX', package: 'led_0805', color: 'green' }),
    R_TX: t.resistor({ name: 'R_TX', package: 'resistor_0805', value: '1k' }), // TX LED current limit

    LED_RX: t.led({ name: 'LED_RX', package: 'led_0805', color: 'green' }),
    R_RX: t.resistor({ name: 'R_RX', package: 'resistor_0805', value: '1k' }), // RX LED current limit

    LED_L: t.led({ name: 'LED_L', package: 'led_0805', color: 'blue' }),
    R_L: t.resistor({ name: 'R_L', package: 'resistor_0805', value: '1k' }), // Pin 13 LED current limit

    // --- Headers ---
    // Fabrication Note: Headers are Through-Hole Technology (THT) for user accessibility.
    // Ensure correct drill sizes and annular rings for robust soldering.
    H1: t.custom.component({
      name: 'HEADER_D0_D7',
      package: 'pin_header_1x8_tht',
      pin_labels: {
        '1': 'D0', '2': 'D1', '3': 'D2', '4': 'D3', '5': 'D4', '6': 'D5', '7': 'D6', '8': 'D7',
      },
    }),
    H2: t.custom.component({
      name: 'HEADER_D8_D13',
      package: 'pin_header_1x8_tht', // Includes RST, GND, AREF, 3V3, 5V, VIN
      pin_labels: {
        '1': 'RST', '2': 'GND', '3': 'D8', '4': 'D9', '5': 'D10', '6': 'D11', '7': 'D12', '8': 'D13',
      },
    }),
    H3: t.custom.component({
      name: 'HEADER_A0_A7',
      package: 'pin_header_1x8_tht',
      pin_labels: {
        '1': 'A0', '2': 'A1', '3': 'A2', '4': 'A3', '5': 'A4', '6': 'A5', '7': 'A6', '8': 'A7',
      },
    }),
    H4: t.custom.component({
      name: 'HEADER_POWER',
      package: 'pin_header_1x6_tht',
      pin_labels: {
        '1': 'VIN', '2': 'GND', '3': 'RST', '4': '5V', '5': '3V3', '6': 'AREF',
      },
    }),
    H5: t.custom.component({
      name: 'HEADER_ICSP',
      package: 'pin_header_2x3_tht',
      pin_labels: {
        '1': 'MISO', '2': 'VCC', '3': 'SCK', '4': 'MOSI', '5': 'RST', '6': 'GND',
      },
    }),
  },

  // Connections
  connections: [
    // --- Power Distribution ---
    t.net('GND').connect(
      'U1.GND', 'U2.GND', 'U3.GND', 'U3.AGND', // Connect both digital and analog GND
      'U4.GND', 'J1.GND', 'J1.SHIELD',
      'C1.2', 'C2.1', 'C3.2', 'C4.1', 'C5.2', 'C6.2', 'C7.2',
      'C8.2', 'C9.2', 'C10.2', 'C11.2', 'C12.2', 'C13.2',
      'R_PWR.2', 'R_TX.2', 'R_RX.2', 'R_L.2',
      'SW1.1', 'SW1.3', // Connect two pins of tactile switch to GND
      'H2.GND', 'H4.GND', 'H5.GND',
    ),
    t.net('VIN_RAW').connect( // Raw VIN input from header
      'H4.VIN',
    ),
    t.net('VIN_REG_IN').connect( // VIN after protection diode, feeds regulator
      'VIN_RAW', 'D1.A',
      'D1.C', 'U1.VIN', // D1.C is the input to the 5V regulator
      'C1.1', // Input cap for U1
    ),
    t.net('USB_VBUS').connect(
      'J1.VBUS', 'D2.A', // USB VBUS to anode of D2
    ),
    t.net('VCC_5V').connect(
      'U1.VOUT', // Output of 5V regulator
      'D2.C', // Cathode of D2 (USB VBUS after diode)
      'C2.2', // Output cap for U1
      'U3.VCC', 'U3.AVCC', // ATmega VCC and AVCC
      'U4.VCC', 'U4.VCC_16', // CH340G VCC pins
      'C5.1', 'C6.1', 'C10.1', // Decoupling caps
      'R_PWR.1', 'LED_PWR.A', // Power LED
      'H4.5V', 'H5.VCC', // Headers
      'U2.VIN', // Input to 3.3V regulator
    ),
    t.net('VCC_3V3').connect(
      'U2.VOUT', 'C3.1', 'C4.2', // 3.3V regulator output and caps
      'H4.3V3', // Header
      'R2.2', // USB DP pull-up
    ),
    t.net('CH340_V3_DECOUPLE').connect( // CH340G internal 3.3V output, only decoupled
      'U4.V3', 'C11.1',
    ),

    // --- ATmega328P Connections ---
    // Crystal
    t.net('ATMEGA_XTAL1').connect('U3.PB6/XTAL1', 'X1.1', 'C8.1'),
    t.net('ATMEGA_XTAL2').connect('U3.PB7/XTAL2', 'X1.2', 'C9.1'),

    // Reset Circuit
    t.net('ATMEGA_RST').connect(
      'U3.PC6/RST', 'R1.1', 'SW1.2', 'SW1.4', // Reset button
      'C7.1', 'H2.RST', 'H4.RST', 'H5.RST',
    ),
    t.net('RST_PULLUP').connect('R1.2', 'VCC_5V'), // Reset pull-up to 5V

    // UART
    t.net('ATMEGA_RX').connect('U3.PD0/RXD', 'CH340_TX'),
    t.net('ATMEGA_TX').connect('U3.PD1/TXD', 'CH340_RX'),

    // Pin 13 LED
    t.net('U3_PD7_PIN').connect('U3.PD7', 'R_L.1', 'H1.D7'), // D7 also connected to LED
    t.net('LED_L_ANODE').connect('R_L.2', 'LED_L.A'),
    t.net('LED_L_CATHODE').connect('LED_L.C', 'GND'), // LED cathode to GND

    // Digital I/O Headers
    t.net('U3_PD0_HEADER').connect('U3.PD0/RXD', 'H1.D0'), // D0/RX
    t.net('U3_PD1_HEADER').connect('U3.PD1/TXD', 'H1.D1'), // D1/TX
    t.net('U3_PD2').connect('U3.PD2', 'H1.D2'),
    t.net('U3_PD3').connect('U3.PD3', 'H1.D3'),
    t.net('U3_PD4').connect('U3.PD4', 'H1.D4'),
    t.net('U3_PD5').connect('U3.PD5', 'H1.D5'),
    t.net('U3_PD6').connect('U3.PD6', 'H1.D6'),

    t.net('U3_PB0').connect('U3.PB0', 'H2.D8'), // D8
    t.net('U3_PB1').connect('U3.PB1', 'H2.D9'), // D9
    t.net('U3_PB2').connect('U3.PB2/SS', 'H2.D10'), // D10
    t.net('U3_PB3').connect('U3.PB3/MOSI', 'H2.D11'), // D11 (MOSI)
    t.net('U3_PB4').connect('U3.PB4/MISO', 'H2.D12'), // D12 (MISO)
    t.net('U3_PB5').connect('U3.PB5/SCK', 'H2.D13'), // D13 (SCK)

    // Analog Inputs
    t.net('U3_PC0').connect('U3.PC0/A0', 'H3.A0'),
    t.net('U3_PC1').connect('U3.PC1/A1', 'H3.A1'),
    t.net('U3_PC2').connect('U3.PC2/A2', 'H3.A2'),
    t.net('U3_PC3').connect('U3.PC3/A3', 'H3.A3'),
    t.net('U3_PC4').connect('U3.PC4/A4/SDA', 'H3.A4'), // SDA
    t.net('U3_PC5').connect('U3.PC5/A5/SCL', 'H3.A5'), // SCL
    t.net('U3_ADC6').connect('U3.ADC6/A6', 'H3.A6'),
    t.net('U3_ADC7').connect('U3.ADC7/A7', 'H3.A7'),

    // AREF
    t.net('U3_AREF').connect('U3.AREF', 'H4.AREF'),

    // ICSP Header
    t.net('U3_MISO').connect('U3.PB4/MISO', 'H5.MISO'),
    t.net('U3_MOSI').connect('U3.PB3/MOSI', 'H5.MOSI'),
    t.net('U3_SCK').connect('U3.PB5/SCK', 'H5.SCK'),

    // --- CH340G Connections ---
    // Crystal
    t.net('CH340_XTAL1').connect('U4.XI', 'X2.1', 'C12.1'),
    t.net('CH340_XTAL2').connect('U4.XO', 'X2.2', 'C13.1'),

    // USB Data
    t.net('USB_DP').connect('J1.DP', 'U4.USB_DP', 'R2.1'),
    t.net('USB_DM').connect('J1.DM', 'U4.USB_DM'),
    t.net('USB_DP_PULLUP').connect('R2.2', 'VCC_3V3'), // CH340G requires 3.3V pull-up on DP

    // DTR for Reset
    t.net('CH340_DTR').connect('U4.DTR#', 'C7.1'), // Connects to ATMEGA_RST via C7

    // TX/RX LEDs
    t.net('U4_TXD_LED_DRIVE').connect('U4.TXD', 'R_TX.1'),
    t.net('LED_TX_ANODE').connect('R_TX.2', 'LED_TX.A'),
    t.net('LED_TX_CATHODE').connect('LED_TX.C', 'GND'),

    t.net('U4_RXD_LED_DRIVE').connect('U4.RXD', 'R_RX.1'),
    t.net('LED_RX_ANODE').connect('R_RX.2', 'LED_RX.A'),
    t.net('LED_RX_CATHODE').connect('LED_RX.C', 'GND'),
  ],
});