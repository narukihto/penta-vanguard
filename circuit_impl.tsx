import * as t from "@tscircuit/builder";

// Fabrication Notes:
// This design aims to replicate the Arduino Nano V3.0 functionality.
// Component selection prioritizes common, production-grade parts.
// Ensure proper decoupling capacitor placement close to IC power pins.
// USB Mini-B connector should be robust for repeated connections.
// Consider thermal relief for large pads and proper trace widths for power lines.
// All components are assumed to be surface-mount (SMD) unless otherwise specified.

// --- Custom Component Definitions (Simplified for tscircuit) ---
// In a real scenario, these would be more detailed with footprints, 3D models, etc.

// ATmega328P-AU (TQFP-32)
const ATmega328P = (params: { name: string }) =>
  t.customComponent({
    name: params.name,
    port_arrangement: {
      left: [
        "PC6/RESET",
        "PD0/RX",
        "PD1/TX",
        "PD2",
        "PD3",
        "PD4",
        "VCC",
        "GND",
        "PB6/XTAL1",
        "PB7/XTAL2",
        "PD5",
        "PD6",
        "PD7",
        "PB0",
        "PB1",
        "PB2",
      ],
      right: [
        "PB3/MOSI",
        "PB4/MISO",
        "PB5/SCK",
        "AVCC",
        "AREF",
        "GND_AVCC", // Separate GND for AVCC
        "PC0/A0",
        "PC1/A1",
        "PC2/A2",
        "PC3/A3",
        "PC4/A4/SDA",
        "PC5/A5/SCL",
      ],
    },
  });

// CH340G (SOP-16)
const CH340G = (params: { name: string }) =>
  t.customComponent({
    name: params.name,
    port_arrangement: {
      left: ["VCC", "GND", "TXD", "RXD", "DTR#", "RTS#", "V3", "RSTI"],
      right: ["XI", "XO", "USB_D+", "USB_D-", "NC1", "NC2", "NC3", "NC4"], // Simplified, NC pins might be different
    },
  });

// AMS1117-5.0 (SOT-223)
const AMS1117_5V = (params: { name: string }) =>
  t.customComponent({
    name: params.name,
    port_arrangement: {
      left: ["VIN"],
      right: ["VOUT", "GND"],
    },
  });

// USB Mini-B Connector
const USB_MINI_B = (params: { name: string }) =>
  t.customComponent({
    name: params.name,
    port_arrangement: {
      left: ["VBUS", "D-", "D+", "ID", "GND"],
    },
  });

// --- Arduino Nano Circuit Definition ---
export const arduinoNano = t.circuit(
  (
    $
  ) => {
    // --- Power Rails ---
    const VCC_5V = $.net("VCC_5V");
    const GND = $.net("GND");
    const USB_VBUS = $.net("USB_VBUS"); // Unregulated USB 5V

    // --- Voltage Regulator (AMS1117-5.0) ---
    const U1_AMS1117 = AMS1117_5V({ name: "U1_AMS1117" });
    U1_AMS1117.VIN.connect(USB_VBUS);
    U1_AMS1117.VOUT.connect(VCC_5V);
    U1_AMS1117.GND.connect(GND);

    // Decoupling for AMS1117
    $.capacitor("C1", "10uF").connect(USB_VBUS, GND); // Input cap
    $.capacitor("C2", "10uF").connect(VCC_5V, GND); // Output cap

    // --- USB-to-Serial Converter (CH340G) ---
    const U2_CH340G = CH340G({ name: "U2_CH340G" });
    U2_CH340G.VCC.connect(VCC_5V);
    U2_CH340G.GND.connect(GND);

    // USB Data Lines
    const USB_D_PLUS = $.net("USB_D_PLUS");
    const USB_D_MINUS = $.net("USB_D_MINUS");
    U2_CH340G.USB_D_PLUS.connect(USB_D_PLUS);
    U2_CH340G.USB_D_MINUS.connect(USB_D_MINUS);

    // CH340G Crystal (12MHz)
    const Y1_CH340G_XTAL = $.crystal("Y1", "12MHz");
    Y1_CH340G_XTAL.pin1.connect(U2_CH340G.XI);
    Y1_CH340G_XTAL.pin2.connect(U2_CH340G.XO);
    $.capacitor("C3", "22pF").connect(U2_CH340G.XI, GND); // Load caps
    $.capacitor("C4", "22pF").connect(U2_CH340G.XO, GND);

    // CH340G V3 pin (internal 3.3V regulator output, often needs a cap)
    $.capacitor("C5", "100nF").connect(U2_CH340G.V3, GND);

    // --- Microcontroller (ATmega328P-AU) ---
    const U3_ATMEGA328P = ATmega328P({ name: "U3_ATMEGA328P" });
    U3_ATMEGA328P.VCC.connect(VCC_5V);
    U3_ATMEGA328P.GND.connect(GND);
    U3_ATMEGA328P.AVCC.connect(VCC_5V); // AVCC connected to VCC
    U3_ATMEGA328P.GND_AVCC.connect(GND); // AVCC GND connected to GND
    U3_ATMEGA328P.AREF.connect(VCC_5V); // AREF connected to VCC (default)

    // Decoupling for ATmega328P
    $.capacitor("C6", "100nF").connect(U3_ATMEGA328P.VCC, GND);
    $.capacitor("C7", "100nF").connect(U3_ATMEGA328P.AVCC, GND);

    // ATmega328P Crystal (16MHz)
    const Y2_ATMEGA_XTAL = $.crystal("Y2", "16MHz");
    Y2_ATMEGA_XTAL.pin1.connect(U3_ATMEGA328P["PB6/XTAL1"]);
    Y2_ATMEGA_XTAL.pin2.connect(U3_ATMEGA328P["PB7/XTAL2"]);
    $.capacitor("C8", "22pF").connect(U3_ATMEGA328P["PB6/XTAL1"], GND); // Load caps
    $.capacitor("C9", "22pF").connect(U3_ATMEGA328P["PB7/XTAL2"], GND);

    // --- USB Mini-B Connector ---
    const J1_USB = USB_MINI_B({ name: "J1_USB" });
    J1_USB.VBUS.connect(USB_VBUS);
    J1_USB["D+"].connect(USB_D_PLUS);
    J1_USB["D-"].connect(USB_D_MINUS);
    J1_USB.GND.connect(GND);

    // --- Serial Communication (CH340G <-> ATmega328P) ---
    const ATMEGA_RX = $.net("ATMEGA_RX");
    const ATMEGA_TX = $.net("ATMEGA_TX");
    U2_CH340G.TXD.connect(ATMEGA_RX); // CH340 TX to ATmega RX
    U2_CH340G.RXD.connect(ATMEGA_TX); // CH340 RX to ATmega TX
    U3_ATMEGA328P["PD0/RX"].connect(ATMEGA_RX);
    U3_ATMEGA328P["PD1/TX"].connect(ATMEGA_TX);

    // --- ATmega328P Reset Circuit ---
    const ATMEGA_RESET_NET = $.net("ATMEGA_RESET");
    U3_ATMEGA328P["PC6/RESET"].connect(ATMEGA_RESET_NET);

    // Reset Button
    const S1_RESET = $.button("S1_RESET");
    S1_RESET.pin1.connect(ATMEGA_RESET_NET);
    S1_RESET.pin2.connect(GND);
    $.resistor("R1", "10k").connect(ATMEGA_RESET_NET, VCC_5V); // Pull-up resistor

    // Auto-reset from CH340G DTR#
    $.capacitor("C10", "100nF").connect(U2_CH340G["DTR#"], ATMEGA_RESET_NET);

    // --- LEDs ---
    // Power LED
    $.led("D1_PWR", "green").cathode.connect(GND);
    $.resistor("R2", "1k").connect(VCC_5V, $.led("D1_PWR").anode);

    // TX LED
    $.led("D2_TX", "yellow").cathode.connect(GND);
    $.resistor("R3", "1k").connect(U2_CH340G.TXD, $.led("D2_TX").anode); // Connect to CH340G TXD

    // RX LED
    $.led("D3_RX", "yellow").cathode.connect(GND);
    $.resistor("R4", "1k").connect(U2_CH340G.RXD, $.led("D3_RX").anode); // Connect to CH340G RXD

    // L LED (Pin 13)
    $.led("D4_L", "blue").cathode.connect(GND);
    $.resistor("R5", "1k").connect(U3_ATMEGA328P["PB5/SCK"], $.led("D4_L").anode); // PB5 is D13

    // --- Headers (Simplified, showing key pins) ---
    // Left Header (Digital Pins + Power)
    const J2_HEADER_LEFT = $.connector("J2", "jp", { pin_count: 15 }); // D0-D7, GND, RESET, 3.3V, 5V, VIN, Aref
    J2_HEADER_LEFT.pin(1).connect(U3_ATMEGA328P["PD0/RX"]); // D0
    J2_HEADER_LEFT.pin(2).connect(U3_ATMEGA328P["PD1/TX"]); // D1
    J2_HEADER_LEFT.pin(3).connect(U3_ATMEGA328P["PD2"]); // D2
    J2_HEADER_LEFT.pin(4).connect(U3_ATMEGA328P["PD3"]); // D3
    J2_HEADER_LEFT.pin(5).connect(U3_ATMEGA328P["PD4"]); // D4
    J2_HEADER_LEFT.pin(6).connect(U3_ATMEGA328P["PD5"]); // D5
    J2_HEADER_LEFT.pin(7).connect(U3_ATMEGA328P["PD6"]); // D6
    J2_HEADER_LEFT.pin(8).connect(U3_ATMEGA328P["PD7"]); // D7
    J2_HEADER_LEFT.pin(9).connect(U3_ATMEGA328P["PB0"]); // D8
    J2_HEADER_LEFT.pin(10).connect(U3_ATMEGA328P["PB1"]); // D9
    J2_HEADER_LEFT.pin(11).connect(U3_ATMEGA328P["PB2"]); // D10
    J2_HEADER_LEFT.pin(12).connect(U3_ATMEGA328P["PB3/MOSI"]); // D11
    J2_HEADER_LEFT.pin(13).connect(U3_ATMEGA328P["PB4/MISO"]); // D12
    J2_HEADER_LEFT.pin(14).connect(U3_ATMEGA328P["PB5/SCK"]); // D13
    J2_HEADER_LEFT.pin(15).connect(GND); // GND

    // Right Header (Analog Pins + Power)
    const J3_HEADER_RIGHT = $.connector("J3", "jp", { pin_count: 15 }); // A0-A7, 5V, RESET, GND, VIN
    J3_HEADER_RIGHT.pin(1).connect(U3_ATMEGA328P["PC0/A0"]); // A0
    J3_HEADER_RIGHT.pin(2).connect(U3_ATMEGA328P["PC1/A1"]); // A1
    J3_HEADER_RIGHT.pin(3).connect(U3_ATMEGA328P["PC2/A2"]); // A2
    J3_HEADER_RIGHT.pin(4).connect(U3_ATMEGA328P["PC3/A3"]); // A3
    J3_HEADER_RIGHT.pin(5).connect(U3_ATMEGA328P["PC4/A4/SDA"]); // A4/SDA
    J3_HEADER_RIGHT.pin(6).connect(U3_ATMEGA328P["PC5/A5/SCL"]); // A5/SCL
    J3_HEADER_RIGHT.pin(7).connect(U3_ATMEGA328P["AVCC"]); // A6 (often used as A6/A7 on Nano, but not direct ATmega pins)
    J3_HEADER_RIGHT.pin(8).connect(U3_ATMEGA328P["AREF"]); // A7 (same as A6)
    J3_HEADER_RIGHT.pin(9).connect(VCC_5V); // 5V
    J3_HEADER_RIGHT.pin(10).connect(ATMEGA_RESET_NET); // RESET
    J3_HEADER_RIGHT.pin(11).connect(GND); // GND
    J3_HEADER_RIGHT.pin(12).connect(USB_VBUS); // VIN (unregulated, from USB or external)
    J3_HEADER_RIGHT.pin(13).connect(GND); // Another GND
    J3_HEADER_RIGHT.pin(14).connect(VCC_5V); // Another 5V
    J3_HEADER_RIGHT.pin(15).connect(GND); // Yet another GND

    // Note: The exact pinout of the headers can vary slightly between Nano versions.
    // This attempts to match a common layout.
  }
);