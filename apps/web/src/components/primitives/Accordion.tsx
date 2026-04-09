/**
 * Accordion — UI Primitive
 * Single point of access to MUI Accordion components.
 */

import {
  Accordion as MuiAccordion,
  AccordionSummary as MuiAccordionSummary,
  AccordionDetails as MuiAccordionDetails,
} from "@mui/material";

export type AccordionProps = React.ComponentProps<typeof MuiAccordion>;
export type AccordionSummaryProps = React.ComponentProps<typeof MuiAccordionSummary>;
export type AccordionDetailsProps = React.ComponentProps<typeof MuiAccordionDetails>;

export const Accordion = MuiAccordion;
export const AccordionSummary = MuiAccordionSummary;
export const AccordionDetails = MuiAccordionDetails;

