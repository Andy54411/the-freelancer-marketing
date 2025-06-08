'use client';

import React, { useEffect, useState } from 'react';
import { UserDataForSettings } from "@/components/SettingsPage";

// ANPASSUNG: 'export' wurde hinzugefügt
export interface AccountingFormProps {
  formData: UserDataForSettings;
  handleChange: (path: string, value: string) => void;
}

const AccountingForm: React.FC<AccountingFormProps> = ({ formData, handleChange }) => {
  const [isSmallBusiness, setIsSmallBusiness] = useState(false);

  useEffect(() => {
    if (formData?.step3?.ust === 'kleinunternehmer') {
      setIsSmallBusiness(true);
      handleChange("step3.profitMethod", "euer");
      handleChange("step3.priceInput", "brutto");
    } else {
      setIsSmallBusiness(false);
    }
  }, [formData?.step3?.ust, handleChange]);

  const baseBoxClass =
    "p-6 rounded-md shadow-sm cursor-pointer transition border ";

  const getBoxClass = (
    selected: boolean,
    disabled = false
  ) => {
    if (disabled) {
      return baseBoxClass + "opacity-50 cursor-not-allowed border-gray-600 bg-gray-700 text-gray-400";
    }
    if (selected) {
      return baseBoxClass + "bg-[#14ad9f] text-white border-[#14ad9f]";
    }
    return (
      baseBoxClass +
      "bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-300 border-gray-300 dark:border-gray-700 hover:bg-[#14ad9f] hover:text-white"
    );
  };

  const labelClass = "block font-medium mb-1 text-gray-900 dark:text-gray-200";
  const inputClass =
    "w-full p-3 border rounded text-black dark:text-gray-100 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600";
  const helperTextClass = "text-sm mt-1 text-gray-600 dark:text-gray-400";

  return (
    <div className="space-y-8 bg-gray-50 dark:bg-gray-900 p-6 rounded-lg">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className={labelClass}>Umsatzsteuer-ID</label>
          <input
            type="text"
            value={formData?.step3?.vatId || ""}
            onChange={(e) => handleChange("step3.vatId", e.target.value)}
            className={inputClass}
            placeholder="z.B. DE123456789"
          />
          <p className={helperTextClass}>Wo finde ich meine USt-ID?</p>
        </div>
        <div>
          <label className={labelClass}>Steuernummer</label>
          <input
            type="text"
            value={formData?.step3?.taxNumber || ""}
            onChange={(e) => handleChange("step3.taxNumber", e.target.value)}
            className={inputClass}
            placeholder="z.B. DE12345678"
          />
          <p className={helperTextClass}>Wo finde ich meine Steuernummer?</p>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className={labelClass}>Amtsgericht</label>
          <input
            type="text"
            value={formData?.step3?.districtCourt || ""}
            onChange={(e) => handleChange("step3.districtCourt", e.target.value)}
            className={inputClass}
          />
          <p className={helperTextClass}>Diese Angaben benötigst du auf deinen Dokumenten, wenn du im Handelsregister eingetragen bist.</p>
        </div>
        <div>
          <label className={labelClass}>Handelsregister-Nr.</label>
          <input
            type="text"
            value={formData?.step3?.companyRegister || ""}
            onChange={(e) => handleChange("step3.companyRegister", e.target.value)}
            className={inputClass}
          />
          <p className={helperTextClass}>Diese Angaben benötigst du auf deinen Dokumenten, wenn du im Handelsregister eingetragen bist.</p>
        </div>
      </div>
      <div className="space-y-3">
        <label className={labelClass}>Umsatzsteuer</label>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {["standard", "kleinunternehmer"].map((type) => (
            <div
              key={type}
              onClick={() => handleChange("step3.ust", type)}
              className={getBoxClass(formData?.step3?.ust === type)}
            >
              <h3 className="font-semibold text-lg">
                {type === "standard" ? "Standard 19%" : "Kleinunternehmer (keine USt)"}
              </h3>
            </div>
          ))}
        </div>
      </div>
      <div className="space-y-3">
        <label className={labelClass}>Gewinnermittlung</label>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div
            onClick={() => handleChange("step3.profitMethod", "euer")}
            className={getBoxClass(formData?.step3?.profitMethod === "euer")}
          >
            <h3 className="font-semibold text-lg">EÜR (Einnahme-Überschuss-Rechnung)</h3>
          </div>
          <div
            onClick={() => !isSmallBusiness && handleChange("step3.profitMethod", "guv")}
            className={getBoxClass(formData?.step3?.profitMethod === "guv", isSmallBusiness)}
          >
            <h3 className="font-semibold text-lg">GuV (Gewinn- und Verlustrechnung)</h3>
          </div>
        </div>
      </div>
      {!isSmallBusiness && (
        <div className="space-y-3">
          <label className={labelClass}>Versteuerungsart</label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div
              onClick={() => handleChange("step3.taxMethod", "soll")}
              className={getBoxClass(formData?.step3?.taxMethod === "soll")}
            >
              <h3 className="font-semibold text-lg">Soll-Versteuerung</h3>
              <p className="text-sm text-gray-700 dark:text-gray-300">bei Rechnungsstellung</p>
            </div>
            <div
              onClick={() => handleChange("step3.taxMethod", "ist")}
              className={getBoxClass(formData?.step3?.taxMethod === "ist")}
            >
              <h3 className="font-semibold text-lg">Ist-Versteuerung</h3>
              <p className="text-sm text-gray-700 dark:text-gray-300">bei Eingang der Zahlung</p>
            </div>
          </div>
        </div>
      )}
      <div>
        <label className={`${labelClass} mb-2`}>Standard Umsatzsteuersatz</label>
        <select
          disabled={isSmallBusiness}
          className="w-1/2 p-3 border rounded text-black dark:text-white bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700"
          value={formData?.step3?.defaultTaxRate || ""}
          onChange={(e) => handleChange("step3.defaultTaxRate", e.target.value)}
        >
          <option value="19">19 %</option>
          <option value="7">7 %</option>
          <option value="0">0 %</option>
        </select>
      </div>
      <div className="space-y-3">
        <label className={labelClass}>Kontenrahmen</label>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {["skro4", "skro3"].map((type) => (
            <div
              key={type}
              onClick={() => handleChange("step3.accountingSystem", type)}
              className={getBoxClass(formData?.step3?.accountingSystem === type)}
            >
              <h3 className="font-semibold text-lg">{type === "skro4" ? "SKR04" : "SKR03"}</h3>
              <p className="text-sm text-gray-700 dark:text-gray-300">
                {type === "skro4" ? "angelehnt an Jahresabschluss" : "angelehnt an Unternehmensabläufe"}
              </p>
            </div>
          ))}
        </div>
      </div>
      <div className="space-y-3">
        <label className={labelClass}>Eingabe von Preisen in...</label>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div
            onClick={() => !isSmallBusiness && handleChange("step3.priceInput", "netto")}
            className={getBoxClass(formData?.step3?.priceInput === "netto", isSmallBusiness)}
          >
            <h3 className="font-semibold text-lg">Netto zzgl. USt</h3>
          </div>
          <div
            onClick={() => handleChange("step3.priceInput", "brutto")}
            className={getBoxClass(formData?.step3?.priceInput === "brutto")}
          >
            <h3 className="font-semibold text-lg">Brutto inkl. USt</h3>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AccountingForm;