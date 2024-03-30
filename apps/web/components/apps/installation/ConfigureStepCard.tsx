import type { TEventType, TEventTypesForm } from "@pages/apps/installation/[[...step]]";
import type { FC } from "react";
import React, { forwardRef, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useFieldArray, useFormContext } from "react-hook-form";
import { useForm } from "react-hook-form";
import type { z } from "zod";

import { EventTypeAppSettings } from "@calcom/app-store/_components/EventTypeAppSettingsInterface";
import type { EventTypeAppsList } from "@calcom/app-store/utils";
import useLockedFieldsManager from "@calcom/features/ee/managed-event-types/hooks/useLockedFieldsManager";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import type { AppCategories } from "@calcom/prisma/enums";
import type { EventTypeMetaDataSchema } from "@calcom/prisma/zod-utils";
import { Button, Form } from "@calcom/ui";
import { X } from "@calcom/ui/components/icon";

import useAppsData from "@lib/hooks/useAppsData";

type TFormType = {
  metadata: z.infer<typeof EventTypeMetaDataSchema>;
};

type ConfigureStepCardProps = {
  slug: string;
  userName: string;
  categories: AppCategories[];
  credentialId?: number;
  loading?: boolean;
  selectedEventTypeIds: number[];
  formPortalRef: React.RefObject<HTMLDivElement>;
  eventTypes: TEventType[];
};

type EventTypeAppSettingsWrapperProps = {
  slug: string;
  userName: string;
  categories: AppCategories[];
  credentialId?: number;
  eventType: TEventType;
  handleDelete: () => void;
  onSubmit: (values: z.infer<typeof EventTypeMetaDataSchema>) => void;
};

const EventTypeAppSettingsWrapper: FC<
  Omit<EventTypeAppSettingsWrapperProps, "handleDelete" | "onSubmit" | "buttonRef">
> = ({ slug, eventType, categories, credentialId }) => {
  const { t } = useLocale();
  const formMethods = useForm();
  const { shouldLockDisableProps } = useLockedFieldsManager({
    eventType,
    translate: t,
    formMethods,
  });
  const { getAppDataGetter, getAppDataSetter } = useAppsData();

  useEffect(() => {
    const appDataSetter = getAppDataSetter(slug as EventTypeAppsList, categories, credentialId);
    appDataSetter("enabled", true);
  }, []);

  return (
    <EventTypeAppSettings
      slug={slug}
      disabled={shouldLockDisableProps("apps").disabled}
      eventType={eventType}
      getAppData={getAppDataGetter(slug as EventTypeAppsList)}
      setAppData={getAppDataSetter(slug as EventTypeAppsList, categories, credentialId)}
    />
  );
};

const EventTypeAppSettingsForm = forwardRef<HTMLButtonElement, EventTypeAppSettingsWrapperProps>(
  function EventTypeAppSettingsForm(props, ref) {
    const { handleDelete, onSubmit, eventType } = props;

    const formMethods = useForm<TFormType>({
      defaultValues: {
        metadata: eventType?.metadata,
      },
    });

    return (
      <Form
        form={formMethods}
        id={`eventtype-${eventType.id}`}
        handleSubmit={() => {
          const data = formMethods.getValues("metadata");
          onSubmit(data);
        }}>
        <div>
          <div className="sm:border-subtle bg-default relative border p-4 dark:bg-black sm:rounded-md">
            <div>
              <span className="text-default font-semibold ltr:mr-1 rtl:ml-1">{eventType.title}</span>{" "}
              <small className="text-subtle hidden font-normal sm:inline">
                /{eventType.team ? eventType.team.slug : props.userName}/{eventType.slug}
              </small>
            </div>
            <EventTypeAppSettingsWrapper {...props} />
            <X className="absolute right-4 top-4 h-4 w-4 cursor-pointer" onClick={() => handleDelete()} />
            <button
              type="submit"
              // className="hidden"
              ref={ref}>
              Save
            </button>
          </div>
        </div>
      </Form>
    );
  }
);

export const ConfigureStepCard: FC<ConfigureStepCardProps> = ({
  loading,
  selectedEventTypeIds,
  formPortalRef,
  eventTypes,
  ...props
}) => {
  const { control, getValues } = useFormContext<TEventTypesForm>();
  const { fields, update } = useFieldArray({
    control,
    name: "eventTypes",
    keyName: "fieldId",
  });
  const [updatedEventTypesStatus, setUpdatedEventTypesStatus] = useState(
    fields.filter((field) => field.selected).map((field) => ({ id: field.id, updated: false }))
  );
  const [submit, setSubmit] = useState(false);
  const allUpdated = updatedEventTypesStatus.every((item) => item.updated);

  useEffect(() => {
    setUpdatedEventTypesStatus(
      updatedEventTypesStatus.filter((state) =>
        fields.some((field) => field.id === state.id && field.selected)
      )
    );
  }, [fields]);

  useEffect(() => {
    if (submit && allUpdated) {
      const data = getValues("eventTypes");
      console.log("ddatadataata: ", data);
      setSubmit(false);
    }
  }, [submit, allUpdated, getValues]);

  const submitRefs = useRef<Array<React.RefObject<HTMLButtonElement>>>([]);
  submitRefs.current = selectedEventTypeIds.map(
    (_ref, index) => (submitRefs.current[index] = React.createRef<HTMLButtonElement>())
  );

  return (
    formPortalRef?.current &&
    createPortal(
      <div className="mt-8">
        <div className="flex flex-col space-y-6">
          {fields.map((field, index) => {
            return (
              field.selected && (
                <EventTypeAppSettingsForm
                  key={field.fieldId}
                  eventType={field}
                  handleDelete={() => {
                    const eventMetadataDb = eventTypes.find(
                      (eventType) => eventType.id == field.id
                    )?.metadata;
                    update(index, { ...field, selected: false, metadata: eventMetadataDb });
                  }}
                  onSubmit={(data) => {
                    console.log("ddatadataata: ", index, field.id, data);
                    update(index, { ...field, metadata: data });
                    const temp = updatedEventTypesStatus.map((item) =>
                      item.id === field.id ? { ...item, updated: true } : item
                    );
                    console.log("ttempemp: ", temp);
                    setUpdatedEventTypesStatus(temp);
                  }}
                  ref={submitRefs.current[index]}
                  {...props}
                />
              )
            );
          })}
        </div>
        <Button
          className="text-md mt-6 w-full justify-center"
          // type="submit"
          onClick={(e) => {
            submitRefs.current.map((ref) => ref.current?.click());
            setSubmit(true);
          }}
          loading={loading}>
          Save
        </Button>
      </div>,
      formPortalRef?.current
    )
  );
};