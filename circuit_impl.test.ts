import { getTestFixture } from "@tscircuit/test-fixture";
import { arduinoNano } from "./arduino-nano"; // Assuming the above code is in arduino-nano.ts

describe("Arduino Nano Circuit", () => {
  let fixture: any; // Type will be more specific with @tscircuit/test-fixture types

  beforeAll(async () => {
    fixture = await getTestFixture(arduinoNano);
  });

  it("should have a netlist", async () => {
    const netlist = await fixture.netlist.getNetlist();
    expect(netlist).toBeDefined();
    expect(Object.keys(netlist).length).toBeGreaterThan(0);
  });

  // --- Power Rail Continuity Checks ---
  describe("Power Rail Continuity", () => {
    it("VCC_5V should be connected to ATmega328P VCC, AVCC", async () => {
      await fixture.assertContinuity("VCC_5V", "U3_ATMEGA328P.VCC");
      await fixture.assertContinuity("VCC_5V", "U3_ATMEGA328P.AVCC");
    });

    it("VCC_5V should be connected to CH340G VCC", async () => {
      await fixture.assertContinuity("VCC_5V", "U2_CH340G.VCC");
    });

    it("VCC_5V should be connected to AMS1117 VOUT", async () => {
      await fixture.assertContinuity("VCC_5V", "U1_AMS1117.VOUT");
    });

    it("USB_VBUS should be connected to AMS1117 VIN and USB connector VBUS", async () => {
      await fixture.assertContinuity("USB_VBUS", "U1_AMS1117.VIN");
      await fixture.assertContinuity("USB_VBUS", "J1_USB.VBUS");
    });

    it("GND should be connected to all major components' GND pins", async () => {
      await fixture.assertContinuity("GND", "U1_AMS1117.GND");
      await fixture.assertContinuity("GND", "U2_CH340G.GND");
      await fixture.assertContinuity("GND", "U3_ATMEGA328P.GND");
      await fixture.assertContinuity("GND", "U3_ATMEGA328P.GND_AVCC");
      await fixture.assertContinuity("GND", "J1_USB.GND");
    });
  });

  // --- Pin-Connectivity for Primary Components ---
  describe("Primary Component Pin Connectivity", () => {
    // ATmega328P
    describe("ATmega328P Connectivity", () => {
      it("should have crystal connected", async () => {
        await fixture.assertContinuity("U3_ATMEGA328P.PB6/XTAL1", "Y2.pin1");
        await fixture.assertContinuity("U3_ATMEGA328P.PB7/XTAL2", "Y2.pin2");
      });

      it("should have serial RX/TX connected to CH340G", async () => {
        await fixture.assertContinuity("U3_ATMEGA328P.PD0/RX", "U2_CH340G.TXD");
        await fixture.assertContinuity("U3_ATMEGA328P.PD1/TX", "U2_CH340G.RXD");
      });

      it("should have reset circuit connected", async () => {
        await fixture.assertContinuity("U3_ATMEGA328P.PC6/RESET", "S1_RESET.pin1");
        await fixture.assertContinuity("U3_ATMEGA328P.PC6/RESET", "R1.pin1");
        await fixture.assertContinuity("U3_ATMEGA328P.PC6/RESET", "C10.pin2");
        await fixture.assertContinuity("U2_CH340G.DTR#", "C10.pin1");
      });

      it("should have D13 LED connected", async () => {
        await fixture.assertContinuity("U3_ATMEGA328P.PB5/SCK", "R5.pin1");
        await fixture.assertContinuity("R5.pin2", "D4_L.anode");
        await fixture.assertContinuity("D4_L.cathode", "GND");
      });
    });

    // CH340G
    describe("CH340G Connectivity", () => {
      it("should have USB data lines connected", async () => {
        await fixture.assertContinuity("U2_CH340G.USB_D+", "J1_USB.D+");
        await fixture.assertContinuity("U2_CH340G.USB_D-", "J1_USB.D-");
      });

      it("should have crystal connected", async () => {
        await fixture.assertContinuity("U2_CH340G.XI", "Y1.pin1");
        await fixture.assertContinuity("U2_CH340G.XO", "Y1.pin2");
      });

      it("should have TX/RX LEDs connected", async () => {
        await fixture.assertContinuity("U2_CH340G.TXD", "R3.pin1");
        await fixture.assertContinuity("R3.pin2", "D2_TX.anode");
        await fixture.assertContinuity("D2_TX.cathode", "GND");

        await fixture.assertContinuity("U2_CH340G.RXD", "R4.pin1");
        await fixture.assertContinuity("R4.pin2", "D3_RX.anode");
        await fixture.assertContinuity("D3_RX.cathode", "GND");
      });
    });

    // AMS1117
    describe("AMS1117 Connectivity", () => {
      it("should have input and output capacitors", async () => {
        await fixture.assertContinuity("U1_AMS1117.VIN", "C1.pin1");
        await fixture.assertContinuity("U1_AMS1117.VOUT", "C2.pin1");
      });
    });

    // Headers
    describe("Header Connectivity", () => {
      it("J2_HEADER_LEFT pins should connect to ATmega328P digital pins", async () => {
        await fixture.assertContinuity("J2_HEADER_LEFT.pin(1)", "U3_ATMEGA328P.PD0/RX");
        await fixture.assertContinuity("J2_HEADER_LEFT.pin(14)", "U3_ATMEGA328P.PB5/SCK"); // D13
      });

      it("J3_HEADER_RIGHT pins should connect to ATmega328P analog pins and power", async () => {
        await fixture.assertContinuity("J3_HEADER_RIGHT.pin(1)", "U3_ATMEGA328P.PC0/A0");
        await fixture.assertContinuity("J3_HEADER_RIGHT.pin(6)", "U3_ATMEGA328P.PC5/A5/SCL");
        await fixture.assertContinuity("J3_HEADER_RIGHT.pin(9)", "VCC_5V");
        await fixture.assertContinuity("J3_HEADER_RIGHT.pin(11)", "GND");
      });
    });
  });
});