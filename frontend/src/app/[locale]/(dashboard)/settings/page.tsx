"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Loader2, Save } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PageHeader } from "@/components/shared/page-header";
import TrialBanner from "@/components/shared/trial-banner";
import api from "@/lib/api";

const COUNTRIES = [
  { value: "US", label: "United States" },
  { value: "AL", label: "Albania" },
  { value: "XK", label: "Kosovo" },
  { value: "MK", label: "North Macedonia" },
  { value: "RS", label: "Serbia" },
  { value: "ME", label: "Montenegro" },
  { value: "HR", label: "Croatia" },
  { value: "BA", label: "Bosnia and Herzegovina" },
  { value: "IT", label: "Italy" },
];

const LANGUAGES = [
  { value: "en", label: "English" },
  { value: "sq", label: "Albanian" },
  { value: "it", label: "Italian" },
];

const DATE_FORMATS = [
  { value: "DD/MM/YYYY", label: "DD/MM/YYYY" },
  { value: "MM/DD/YYYY", label: "MM/DD/YYYY" },
  { value: "YYYY-MM-DD", label: "YYYY-MM-DD" },
];

const CURRENCIES = [
  { value: "USD", label: "USD" },
  { value: "EUR", label: "EUR" },
  { value: "ALL", label: "ALL" },
  { value: "GBP", label: "GBP" },
];

interface SettingsData {
  companyName: string;
  logoUrl: string;
  website: string;
  phone: string;
  email: string;
  country: string;
  language: string;
  timezone: string;
  dateFormat: string;
  defaultCurrency: string;
  defaultVatRate: number;
  iban: string;
  bankName: string;
  swiftBic: string;
  vatNumber: string;
  taxId: string;
  registrationNumber: string;
  street: string;
  city: string;
  state: string;
  postalCode: string;
  legalCountry: string;
}

interface ApiResponse {
  success: boolean;
  data: SettingsData & {
    tenant: { plan: string; trialEndsAt: string; status: string };
  };
}

interface SettingsFormProps {
  role?: string;
}

export default function SettingsPage({ role }: SettingsFormProps) {
  const queryClient = useQueryClient();
  const ts = useTranslations("settings");
  const tc = useTranslations("common");
  const isAdmin = role === "ADMIN";

  const { data: response, isLoading } = useQuery<ApiResponse>({
    queryKey: ["settings"],
    queryFn: async () => {
      const res = await api.get("/settings");
      return res.data;
    },
  });

  const settings = response?.data;

  const generalForm = useForm<SettingsData>({
    defaultValues: {
      companyName: "",
      logoUrl: "",
      website: "",
      phone: "",
      email: "",
      country: "",
      language: "en",
      timezone: "",
      dateFormat: "DD/MM/YYYY",
    },
  });

  const financialForm = useForm<SettingsData>({
    defaultValues: {
      defaultCurrency: "EUR",
      defaultVatRate: 0,
      iban: "",
      bankName: "",
      swiftBic: "",
    },
  });

  const legalForm = useForm<SettingsData>({
    defaultValues: {
      vatNumber: "",
      taxId: "",
      registrationNumber: "",
      street: "",
      city: "",
      state: "",
      postalCode: "",
      legalCountry: "",
    },
  });

  useEffect(() => {
    if (settings) {
      generalForm.reset({
        companyName: settings.companyName ?? "",
        logoUrl: settings.logoUrl ?? "",
        website: settings.website ?? "",
        phone: settings.phone ?? "",
        email: settings.email ?? "",
        country: settings.country ?? "",
        language: settings.language ?? "en",
        timezone: settings.timezone ?? "",
        dateFormat: settings.dateFormat ?? "DD/MM/YYYY",
      });
      financialForm.reset({
        defaultCurrency: settings.defaultCurrency ?? "EUR",
        defaultVatRate: settings.defaultVatRate ?? 0,
        iban: settings.iban ?? "",
        bankName: settings.bankName ?? "",
        swiftBic: settings.swiftBic ?? "",
      });
      legalForm.reset({
        vatNumber: settings.vatNumber ?? "",
        taxId: settings.taxId ?? "",
        registrationNumber: settings.registrationNumber ?? "",
        street: settings.street ?? "",
        city: settings.city ?? "",
        state: settings.state ?? "",
        postalCode: settings.postalCode ?? "",
        legalCountry: settings.legalCountry ?? "",
      });
    }
  }, [settings, generalForm, financialForm, legalForm]);

  const mutation = useMutation({
    mutationFn: async (partial: Partial<SettingsData>) => {
      const res = await api.patch("/settings", partial);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["settings"] });
      toast.success(ts("save_success"));
    },
    onError: () => {
      toast.error(ts("save_failed"));
    },
  });

  const onSaveGeneral = (data: SettingsData) => {
    mutation.mutate({
      companyName: data.companyName,
      logoUrl: data.logoUrl,
      website: data.website,
      phone: data.phone,
      email: data.email,
      country: data.country,
      language: data.language,
      timezone: data.timezone,
      dateFormat: data.dateFormat,
    });
  };

  const onSaveFinancial = (data: SettingsData) => {
    mutation.mutate({
      defaultCurrency: data.defaultCurrency,
      defaultVatRate: data.defaultVatRate,
      iban: data.iban,
      bankName: data.bankName,
      swiftBic: data.swiftBic,
    });
  };

  const onSaveLegal = (data: SettingsData) => {
    mutation.mutate({
      vatNumber: data.vatNumber,
      taxId: data.taxId,
      registrationNumber: data.registrationNumber,
      street: data.street,
      city: data.city,
      state: data.state,
      postalCode: data.postalCode,
      legalCountry: data.legalCountry,
    });
  };

  const isFreeTrial = settings?.tenant?.plan === "FREE_TRIAL";

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader title={ts("page_title")} subtitle={ts("page_subtitle")} />

      {isFreeTrial && <TrialBanner trialEndsAt={settings?.tenant?.trialEndsAt} plan={settings?.tenant?.plan || "FREE_TRIAL"} />}

      <Tabs defaultValue="general">
        <TabsList>
          <TabsTrigger value="general">{ts("tab_general")}</TabsTrigger>
          <TabsTrigger value="financial">{ts("tab_financial")}</TabsTrigger>
          <TabsTrigger value="legal">{ts("tab_legal")}</TabsTrigger>
        </TabsList>

        <TabsContent value="general">
          <Card>
            <CardHeader>
              <CardTitle>{ts("general_title")}</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={generalForm.handleSubmit(onSaveGeneral)} className="space-y-6">
                <div className="space-y-2">
                  <Label>{ts("logo_label")}</Label>
                  <Input type="file" accept="image/*" />
                  {settings?.logoUrl && (
                    <img
                      src={settings.logoUrl}
                      alt="Company logo"
                      className="h-12 w-auto object-contain mt-2 rounded border"
                    />
                  )}
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="companyName">{ts("company_name_label")}</Label>
                    <Input
                      id="companyName"
                      {...generalForm.register("companyName", { required: true })}
                      disabled={!isAdmin}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="website">{ts("website_label")}</Label>
                    <Input
                      id="website"
                      {...generalForm.register("website")}
                      disabled={!isAdmin}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">{ts("phone_label")}</Label>
                    <Input
                      id="phone"
                      {...generalForm.register("phone")}
                      disabled={!isAdmin}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">{ts("email_label")}</Label>
                    <Input
                      id="email"
                      type="email"
                      {...generalForm.register("email")}
                      disabled={!isAdmin}
                    />
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                  <div className="space-y-2">
                    <Label>{ts("country_label")}</Label>
                    <Select
                      value={generalForm.watch("country")}
                      onValueChange={(v) => generalForm.setValue("country", v)}
                      disabled={!isAdmin}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={ts("country_placeholder")} />
                      </SelectTrigger>
                      <SelectContent>
                        {COUNTRIES.map((c) => (
                          <SelectItem key={c.value} value={c.value}>
                            {c.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>{ts("language_label")}</Label>
                    <Select
                      value={generalForm.watch("language")}
                      onValueChange={(v) => generalForm.setValue("language", v)}
                      disabled={!isAdmin}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={ts("language_placeholder")} />
                      </SelectTrigger>
                      <SelectContent>
                        {LANGUAGES.map((l) => (
                          <SelectItem key={l.value} value={l.value}>
                            {l.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>{ts("date_format_label")}</Label>
                    <Select
                      value={generalForm.watch("dateFormat")}
                      onValueChange={(v) => generalForm.setValue("dateFormat", v)}
                      disabled={!isAdmin}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={ts("date_format_placeholder")} />
                      </SelectTrigger>
                      <SelectContent>
                        {DATE_FORMATS.map((f) => (
                          <SelectItem key={f.value} value={f.value}>
                            {f.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="timezone">{ts("timezone_label")}</Label>
                  <Input
                    id="timezone"
                    placeholder="e.g. Europe/Tirane"
                    {...generalForm.register("timezone")}
                    disabled={!isAdmin}
                  />
                </div>

                {isAdmin && (
                  <Button type="submit" disabled={mutation.isPending}>
                    {mutation.isPending ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="mr-2 h-4 w-4" />
                    )}
                    {tc("save_changes")}
                  </Button>
                )}
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="financial">
          <Card>
            <CardHeader>
              <CardTitle>{ts("financial_title")}</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={financialForm.handleSubmit(onSaveFinancial)} className="space-y-6">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>{ts("default_currency_label")}</Label>
                    <Select
                      value={financialForm.watch("defaultCurrency")}
                      onValueChange={(v) => financialForm.setValue("defaultCurrency", v)}
                      disabled={!isAdmin}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={ts("default_currency_placeholder")} />
                      </SelectTrigger>
                      <SelectContent>
                        {CURRENCIES.map((c) => (
                          <SelectItem key={c.value} value={c.value}>
                            {c.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="defaultVatRate">{ts("default_vat_rate_label")}</Label>
                    <Input
                      id="defaultVatRate"
                      type="number"
                      step="0.01"
                      {...financialForm.register("defaultVatRate", { valueAsNumber: true })}
                      disabled={!isAdmin}
                    />
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="iban">{ts("iban_label")}</Label>
                    <Input
                      id="iban"
                      {...financialForm.register("iban")}
                      disabled={!isAdmin}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="bankName">{ts("bank_name_label")}</Label>
                    <Input
                      id="bankName"
                      {...financialForm.register("bankName")}
                      disabled={!isAdmin}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="swiftBic">{ts("swift_bic_label")}</Label>
                  <Input
                    id="swiftBic"
                    {...financialForm.register("swiftBic")}
                    disabled={!isAdmin}
                  />
                </div>

                {isAdmin && (
                  <Button type="submit" disabled={mutation.isPending}>
                    {mutation.isPending ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="mr-2 h-4 w-4" />
                    )}
                    {tc("save_changes")}
                  </Button>
                )}
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="legal">
          <Card>
            <CardHeader>
              <CardTitle>{ts("legal_title")}</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={legalForm.handleSubmit(onSaveLegal)} className="space-y-6">
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="space-y-2">
                    <Label htmlFor="vatNumber">{ts("vat_number_label")}</Label>
                    <Input
                      id="vatNumber"
                      {...legalForm.register("vatNumber")}
                      disabled={!isAdmin}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="taxId">{ts("tax_id_label")}</Label>
                    <Input
                      id="taxId"
                      {...legalForm.register("taxId")}
                      disabled={!isAdmin}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="registrationNumber">{ts("reg_number_label")}</Label>
                    <Input
                      id="registrationNumber"
                      {...legalForm.register("registrationNumber")}
                      disabled={!isAdmin}
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="text-sm font-medium">{ts("address")}</h4>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="street">{ts("street_label")}</Label>
                      <Input
                        id="street"
                        {...legalForm.register("street")}
                        disabled={!isAdmin}
                      />
                    </div>
                    <div className="grid gap-4 md:grid-cols-3">
                      <div className="space-y-2">
                        <Label htmlFor="city">{ts("city_label")}</Label>
                        <Input
                          id="city"
                          {...legalForm.register("city")}
                          disabled={!isAdmin}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="state">{ts("state_label")}</Label>
                        <Input
                          id="state"
                          {...legalForm.register("state")}
                          disabled={!isAdmin}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="postalCode">{ts("postal_code_label")}</Label>
                        <Input
                          id="postalCode"
                          {...legalForm.register("postalCode")}
                          disabled={!isAdmin}
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>{ts("country_label")}</Label>
                      <Select
                        value={legalForm.watch("legalCountry")}
                        onValueChange={(v) => legalForm.setValue("legalCountry", v)}
                        disabled={!isAdmin}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder={ts("country_placeholder")} />
                        </SelectTrigger>
                        <SelectContent>
                          {COUNTRIES.map((c) => (
                            <SelectItem key={c.value} value={c.value}>
                              {c.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                {isAdmin && (
                  <Button type="submit" disabled={mutation.isPending}>
                    {mutation.isPending ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="mr-2 h-4 w-4" />
                    )}
                    {tc("save_changes")}
                  </Button>
                )}
              </form>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
