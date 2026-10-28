"use client";
import { PhoneInput } from "@/components/custom/phone-input";
import { Minus, Plus, Search } from "lucide-react";
import { useState } from "react";
import { ButtonWithIcon } from "@/components/custom/button-with-icon";
import { InputWithIcon } from "@/components/custom/input-with-icon";
import { Label } from "@/components/ui/label";
import ColorPicker from "@/components/custom/color-picker";

export default function DemoByIpanks() {
  const [phoneNumber, setPhoneNumber] = useState<string>("");
    const [color, setColor] = useState<string>("#FF0000");
  return (
    <div className="flex gap-2 flex-col">
      <h1>Demo Custom Components By Ipanks</h1>
      <div className="flex flex-col gap-2">
        <h1>Button With Icon</h1>
        <div>
          <ButtonWithIcon startIcon={<Plus />} endIcon={<Minus />}>
            Button
          </ButtonWithIcon>
        </div>
      </div>
      <div className="flex flex-col gap-2">
        <h1>current phone input : {phoneNumber}</h1>
        <h1>Phone Input</h1>
        <div className="max-w-75">
          <PhoneInput defaultCountry="ID" onChange={setPhoneNumber} value={phoneNumber} />
        </div>
      </div>
      <div className="flex flex-col gap-2">
        <h1>Input With Icon</h1>
        <div className="max-w-75">
          <Label>
            <InputWithIcon>
              <Search size={16} />
              <input type="search" data-slot="search" placeholder="Search" />
              <Search size={16} />
            </InputWithIcon>
          </Label>
        </div>
      </div>
      <div className="flex flex-col gap-2">
        <h1>Color Picker</h1>
        <div className="max-w-75 flex gap-2 items-center">
          <ColorPicker onChange={setColor} value={color}  />
          <div className="w-10 h-10" style={{ backgroundColor: color }} />
        </div>
      </div>
    </div>
  );
}
