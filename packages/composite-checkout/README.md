# Composite Checkout

A set of React components, custom Hooks, and helper functions that together can be used to create a purchase and checkout flow.

## Installation

You can install this package using yarn with:

`yarn add @automattic/composite-checkout`

Or with npm:

`npm install @automattic/composite-checkout`

## Description

This package has four pieces that can be used together or separately:

- [A data provider.](#the-data-provider)
- [A multi-step form.](#the-multi-step-form)
- [A list of payment method options.](#the-list-of-payment-method-options)
- [A transaction system.](#the-transaction-system)

The primary use is to combine all these pieces to create a checkout flow with a payment method selection step that can submit a transaction and handle the result, but it is possible to heavily customize this behavior or to use these pieces in other ways.

### The data provider

All this package's React components require being inside of a [CheckoutProvider](#CheckoutProvider).

It has many optional props, but the main ones you need to know are `paymentMethods` and `paymentProcessors`.

`paymentMethods` is an array of [payment method objects](#payment-methods). These are a special type of object containing a UI label element for that payment method, an optional form for data that payment method may need, and a submit button for that payment method. The payment method object is purely UI and state; the actual submission of its data will be handled by the payment processor function.

`paymentProcessors` is an object map of payment processor functions keyed by their id. The key is defined by payment method objects that wish to use the processor. The object's value is an async function which will be called when the submit button in a payment method object is pressed. This function will return a special value to notify the transaction system about the status of the transaction.

### The multi-step form

A [CheckoutStepGroup](#CheckoutStepGroup) can be used to wrap [CheckoutStep](#CheckoutStep) components, creating a form with multiple steps. Each step contains a UI element and an async function that decides if the step is complete.

When the final step is complete, the active payment method's submit button (rendered by [CheckoutFormSubmit](#CheckoutFormSubmit)) will be enabled.

The steps can contain any sort of data, but one of the steps should typically be a list of payment method options.

### The list of payment method options

The [PaymentMethodStep](#PaymentMethodStep) is a pre-built [CheckoutStep](#CheckoutStep) which lists all the available payment methods passed to the [CheckoutProvider](#CheckoutProvider) as radio buttons.

### The transaction system

While the transaction is processing, the entire form will be marked as disabled and will have a busy indicator.

When a payment processor function tells the transaction system that the transaction is complete, has an error, or has a redirect, an appropriate callback will be called on the [CheckoutProvider](#CheckoutProvider): `onPaymentComplete`, `onPaymentError`, or `onPaymentRedirect`, respectively.

## Example

See the [demo](demo/index.js) for an example of using this package.

## Styles and Themes

Each component will be styled using [@emotion/styled](https://emotion.sh/docs/styled) and many of the styles will be editable by passing a `theme` object to the [CheckoutProvider](#CheckoutProvider). The [checkoutTheme](#checkoutTheme) object is available from the package API, and can be merged with new values to customize the design.

## Payment Methods

Each payment method is an object with the following properties:

- `id: string`. A unique id for this instance of this payment method.
- `paymentProcessorId: string`. The id that will be used to map this payment method to a payment processor function. Unlike the `id`, this does not have to be unique.
- `label?: React.ReactNode`. A component that displays that payment method selection button which can be as simple as the name and an icon.
- `activeContent?: React.ReactNode`. A component that displays that payment method (this can return null or something like a credit card form).
- `inactiveContent?: React.ReactNode`. A component that renders a summary of the selected payment method when the step is inactive.
- `submitButton: React.ReactNode`. A component button that is used to submit the payment method. This button should include a click handler that performs the actual payment process. When disabled, it will be provided with the `disabled` prop and must disable the button.
- `getAriaLabel: (localize: (value: string) => string) => string`. A function to return the name of the Payment Method. It will receive the localize function as an argument.

Within the components inside [CheckoutProvider](#CheckoutProvider), [usePaymentMethod](#usePaymentMethod) will return the currently selected payment method object if one is selected.

When a payment method is ready to submit its data, it can use an appropriate "payment processor" function. These are functions passed to [CheckoutProvider](#CheckoutProvider) with the `paymentProcessors` prop and each one has a unique key. For convenience, the `submitButton` will be provided with an `onClick` function prop that will begin the transaction. The `onClick` function takes one argument, an object that contains the data needed by the payment processor function.

The payment processor function's response will control what happens next. Each payment processor function must return a Promise that resolves to one of four results: [makeManualResponse](#makeManualResponse), [makeRedirectResponse](#makeRedirectResponse), [makeSuccessResponse](#makeSuccessResponse), or [makeErrorResponse](#makeErrorResponse).

## API

### Button

A generic button component that is used internally for almost all buttons (like the "Continue" button on each step). You can use it if you want a button with a similar appearance. It has the following explicit props, and any additional props will be passed on directly to the HTML `button` (eg: `onClick`).

- `buttonType?: 'paypal'|'primary'|'secondary'|'text-button'|'borderless'`. An optional special button style.
- `fullWidth?: bool`. The button width defaults to 'auto', but if this is set it will be '100%'.
- `isBusy?: bool`. If true, the button will be displayed as a loading spinner.

### Checkout

The main wrapper component for Checkout. It has the following props.

- `className?: string`. The className for the component.

### CheckoutFormSubmit

An element that will display a [CheckoutSubmitButton](#CheckoutSubmitButton) when placed inside a [CheckoutStepGroup](#CheckoutStepGroup).

### CheckoutCheckIcon

An icon that is displayed for each complete step.

Requires an `id` prop, which is a string that is used to construct the SVG `id`.

### CheckoutErrorBoundary

A [React error boundary](https://reactjs.org/docs/error-boundaries.html) that can be used to wrap any components you like. There are several layers of these already built-in to `CheckoutProvider` and its children, but you may use this to manually wrap components. It has the following props.

- `errorMessage: React.ReactNode`. The error message to display to the user if there is a problem; typically a string but can also be a component.
- `onError?: (error: Error) => void`. A function to be called when there is an error. Can be used for logging.

### CheckoutProvider

Renders its `children` prop and acts as a React Context provider. All of checkout should be wrapped in this.

It has the following props.

- `items: object[]`. An array of [line item objects](#line-items) that will be displayed in the form.
- `total: object`. A [line item object](#line-items) with the final total to be paid.
- `theme?: object`. A [theme object](#styles-and-themes).
- `onPaymentComplete?: ({paymentMethodId: string | null, transactionLastResponse: unknown }) => null`. A function to call for non-redirect payment methods when payment is successful. Passed the current payment method id and the transaction response as set by the payment processor function.
- `onPaymentRedirect?: ({paymentMethodId: string | null, transactionLastResponse: unknown }) => null`. A function to call for redirect payment methods when payment begins to redirect. Passed the current payment method id and the transaction response as set by the payment processor function.
- `onPaymentError?: ({paymentMethodId: string | null, transactionError: string | null }) => null`. A function to call for payment methods when payment is not successful.
- `onPageLoadError?: ( errorType: string, errorMessage: string, errorData?: Record< string, string | number | undefined > ) => void`. A function to call when an internal error boundary triggered.
- `onStepChanged?: ({ stepNumber: number | null; previousStepNumber: number; paymentMethodId: string }) => void`. A function to call when the active checkout step is changed.
- `onPaymentMethodChanged?: (method: string) => void`. A function to call when the active payment method is changed. The argument will be the method's id.
- `paymentMethods: object[]`. An array of [Payment Method objects](#payment-methods).
- `paymentProcessors: object`. A key-value map of payment processor functions (see [Payment Methods](#payment-methods)).
- `isLoading?: boolean`. If set and true, the form will be replaced with a loading placeholder and the form status will be set to [`.LOADING`](#FormStatus) (see [useFormStatus](#useFormStatus)).
- `isValidating?: boolean`. If set and true, the form status will be set to [`.VALIDATING`](#FormStatus) (see [useFormStatus](#useFormStatus)).
- `redirectToUrl?: (url: string) => void`. Will be used by [useTransactionStatus](#useTransactionStatus) if it needs to redirect. If not set, it will change `window.location.href`.
- `initiallySelectedPaymentMethodId?: string | null`. If set, is used to preselect a payment method when the `paymentMethods` array changes. Default is `null`, which yields no initial selection. To change the selection in code, see the [`usePaymentMethodId`](#usePaymentMethodId) hook.

The line items are for display purposes only. They should also include subtotals, discounts, and taxes. No math will be performed on the line items. Instead, the amount to be charged will be specified by the required prop `total`, which is another line item.

In addition, `CheckoutProvider` monitors the [transaction status](#useTransactionStatus) and will take actions when it changes.

- If the `transactionStatus` changes to [`.PENDING`](#TransactionStatus), the [form status](#useFormStatus) will be set to [`.SUBMITTING`](#FormStatus).
- If the `transactionStatus` changes to [`.ERROR`](#TransactionStatus), the transaction status will be set to [`.NOT_STARTED`](#TransactionStatus), the [form status](#useFormStatus) will be set to [`.READY`](#FormStatus), and the error message will be sent to the `onPaymentError` handler.
- If the `transactionStatus` changes to [`.COMPLETE`](#TransactionStatus), the [form status](#useFormStatus) will be set to [`.COMPLETE`](#FormStatus) (which will cause the `onPaymentComplete` function to be called).
- If the `transactionStatus` changes to [`.REDIRECTING`](#TransactionStatus), the page will be redirected to the `transactionRedirectUrl` (or will register an error as above if there is no url).
- If the `transactionStatus` changes to [`.NOT_STARTED`](#TransactionStatus), the [form status](#useFormStatus) will be set to [`.READY`](#FormStatus).

### CheckoutReviewOrder

Renders a list of the line items and their `displayValue` properties followed by the `total` line item, and whatever `submitButton` is in the current payment method.

### CheckoutStep

A checkout step. This should be a direct child of [CheckoutSteps](#CheckoutSteps) and is itself a wrapper for [CheckoutStepBody](#CheckoutStepBody). If you want to make something that looks like a step but is not connected to other steps, use a [CheckoutStepBody](#CheckoutStepBody) instead.

This component's props are:

- `stepId: string`. A unique ID for the step.
- `className?: string`. A className for the step wrapper.
- `titleContent: React.ReactNode`. Displays as the title of the step.
- `activeStepContent?: React.ReactNode`. Displays as the content of the step when it is active. It is also displayed when the step is inactive but is hidden by CSS.
- `completeStepContent?: React.ReactNode`. Displays as the content of the step when it is inactive and complete as defined by the `isCompleteCallback`.
- `isCompleteCallback: () => boolean | Promise<boolean>`. Used to determine if a step is complete for purposes of validation. Note that this is not called for the last step!
- `editButtonAriaLabel?: string`. Used to fill in the `aria-label` attribute for the "Edit" button if one exists.
- `nextStepButtonAriaLabel?: string`. Used to fill in the `aria-label` attribute for the "Continue" button if one exists.
- `editButtonText?: string`. Used in place of "Edit" on the edit step button.
- `nextStepButtonText?: string`. Used in place of "Continue" on the next step button.
- `validatingButtonText?: string`. Used in place of "Please wait…" on the next step button when `isCompleteCallback` returns an unresolved Promise.
- `validatingButtonAriaLabel:? string`. Used for the `aria-label` attribute on the next step button when `isCompleteCallback` returns an unresolved Promise.

### CheckoutStepArea

Creates the Checkout form and provides a wrapper for [CheckoutStep](#CheckoutStep) and [CheckoutStepBody](#CheckoutStepBody) objects. Should be a direct child of [Checkout](#Checkout).

This component's props are:

- `submitButtonHeader: React.ReactNode`. Displays with the Checkout submit button.
- `submitButtonFooter: React.ReactNode`. Displays with the Checkout submit button.
- `disableSubmitButton: boolean`. If true, the submit button will always be disabled. If false (the default), the submit button will be enabled only on the last step and only if the [formStatus](#useFormStatus) is [`.READY`](#FormStatus).

### CheckoutStepAreaWrapper

A styled div, controlled by the [theme](#checkoutTheme), that's used as the inner wrapper for the [CheckoutStepArea](#CheckoutStepArea) component. You shouldn't need to use this manually.

### CheckoutStepBody

A component that looks like a checkout step. Normally you don't need to use this directly, since [CheckoutStep](#CheckoutStep) creates this for you, but you can use it manually if you wish.

This component's props are:

- `stepId: string`. A unique ID for this step.
- `isStepActive: boolean`. True if the step should be rendered as active. Renders `activeStepContent`.
- `isStepComplete: boolean`. True if the step should be rendered as complete. Renders `completeStepContent`.
- `stepNumber: number`. The step number to display for the step.
- `totalSteps: number`. The total number of steps in the current connected group of steps.
- `errorMessage?: string`. The error message to display in the React error boundary if there is an error thrown by any component in this step.
- `onError?: (error: Error) => void`. A callback to be called from the React error boundary if there is an error thrown by any component in this step.
- `editButtonText?: string`. The text to display instead of "Edit" for the edit step button.
- `editButtonAriaLabel?: string`. The text to display for `aria-label` instead of "Edit" for the edit step button.
- `nextStepButtonText?: string`. Like `editButtonText` but for the "Continue" button.
- `nextStepButtonAriaLabel?: string`. Like `editButtonAriaLabel` but for the "Continue" button.
- `validatingButtonText?: string`. Like `editButtonText` but for the "Please wait…" button when `formStatus` is `validating`.
- `validatingButtonAriaLabel?: string`. Like `editButtonAriaLabel` but for the "Please wait…" button.
- `className?: string`. A className for the component.
- `goToThisStep?: () => void`. A function to be called when the "Edit" button is pressed.
- `goToNextStep?: () => void`. A function to be called when the "Continue" button is pressed.
- `nextStepNumber?: number`. The step number of the step that will be active after the "Continue" button is pressed.
- `formStatus?: string`. The current form status. See [useFormStatus](#useFormStatus).
- `titleContent: React.ReactNode`. Displays as the title of the step.
- `activeStepContent?: React.ReactNode`. Displays as the content of the step when it is active. It is also displayed when the step is inactive but is hidden by CSS.
- `completeStepContent?: React.ReactNode`. Displays as the content of the step when it is inactive and complete as defined by `isStepComplete` and `isStepActive`.

### CheckoutStepGroup

A container for [CheckoutStep](#CheckoutStep) elements.

### CheckoutSteps

A wrapper for [CheckoutStep](#CheckoutStep) objects that will connect the steps and provide a way to switch between them. Should be a direct child of [Checkout](#Checkout). It has the following props.

- `areStepsActive?: boolean`. Whether or not the set of steps is active and able to be edited. Defaults to `true`.

### CheckoutSubmitButton

The submit button for the form. This actually renders the submit button for the currently active payment method, but it provides the `onClick` handler to attach it to the payment processor function, a `disabled` prop when the form should be disabled, and a React Error boundary. Normally this is already rendered by [CheckoutFormSubmit](#CheckoutFormSubmit), but if you want to use it directly, you can.

The props you can provide to this component are as follows.

- `className?: string`. An optional className.
- `disabled?: boolean`. The button will automatically be disabled if the [form status](#useFormStatus) is not `ready`, but you can disable it for other cases as well.
- `onLoadError?: ( error: string ) => void`. A callback that will be called if the error boundary is triggered.

### CheckoutSummaryArea

Renders its `children` prop and acts as a wrapper to flow outside of the [`CheckoutSteps`](#CheckoutSteps) wrapper (floated on desktop, collapsed on mobile). It has the following props.

- `className?: string`. The className for the component.

### CheckoutSummaryCard

Can be used inside [CheckoutSummaryArea](#CheckoutSummaryArea) to render a bordered area.

### FormStatus

An enum that holds the values of the [form status](#useFormStatus).

- `.LOADING`
- `.READY`
- `.SUBMITTING`
- `.VALIDATING`
- `.COMPLETE`

### MainContentWrapper

A styled div, controlled by the [theme](#checkoutTheme), that's used as the inner wrapper for the [Checkout](#Checkout) component. You shouldn't need to use this manually.

### OrderReviewLineItems

Renders a list of line items passed in the `items` prop. Each line item must have at least the props `label`, `id`, and `amount.displayValue`.

An optional boolean prop, `collapsed`, can be used to simplify the output for when the review section is collapsed.

This component provides just a simple list of label and price. If you want to modify how each line item is displayed, or if you want to provide any actions for that item (eg: the ability to delete the item from the order), you cannot use this component; instead you should create a custom component.

### OrderReviewSection

A wrapper for a section of a list of related line items. Renders its `children` prop.

### OrderReviewTotal

Renders the `total` prop like a line item, but with different styling.

An optional boolean prop, `collapsed`, can be used to simplify the output for when the review section is collapsed.

### PaymentLogo

Renders a logo for a credit card.

Takes two props:

- `brand: string`. This is a lower-case card name, like `visa` or `mastercard`.
- `isSummary: boolean`. If true, will display a more compact version of the logo.

### PaymentMethodStep

A pre-built [CheckoutStep](#CheckoutStep) to select the payment method. It does not require any props but any of the [CheckoutStep](#CheckoutStep) props can be overridden by passing them to this component.

### RadioButton

Renders a radio button wrapper for payment methods or other similar boxes.

Props:

- `name: string`
- `id: string`
- `label: React.ReactNode`
- `disabled?: boolean`
- `checked?: boolean`
- `value: string`
- `onChange?: () => void`
- `ariaLabel: string`
- `children?: React.ReactNode`

### PaymentProcessorResponseType

An enum that holds the values of the [payment processor function return value's `type` property](#payment-methods) (each payment processor function returns a Promise that resolves to `{type: PaymentProcessorResponseType, payload: string | unknown }` where the payload varies based on the response type).

- `.SUCCESS` (the payload will be an `unknown` object that is the server response).
- `.REDIRECT` (the payload will be a `string` that is the redirect URL).
- `.MANUAL` (the payload will be an `unknown` object that is determined by the payment processor function).
- `.ERROR` (the payload will be a `string` that is the error message).

### SubmitButtonWrapper

A styled div, controlled by the [theme](#checkoutTheme), that's used as the inner wrapper for the submit button that's rendered by each [CheckoutFormSubmit](#CheckoutFormSubmit) component. You shouldn't need to use this manually.

### TransactionStatus

An enum that holds the values of the [transaction status](#useTransactionStatus).

- `.NOT_STARTED`
- `.PENDING`
- `.COMPLETE`
- `.REDIRECTING`
- `.ERROR`

### checkoutTheme

An [@emotion/styled](https://emotion.sh/docs/styled) theme object that can be merged with custom theme variables and passed to [CheckoutProvider](#checkout-provider) in order to customize the default Checkout design.

### getDefaultOrderReviewStep

Returns a step object whose properties can be added to a [CheckoutStep](CheckoutStep) (and customized) to display an itemized order review.

### getDefaultOrderSummaryStep

Returns a step object whose properties can be added to a [CheckoutStep](CheckoutStep) (and customized) to display a brief order summary.

### getDefaultPaymentMethodStep

Returns a step object whose properties can be added to a [CheckoutStep](CheckoutStep) (and customized) to display a way to select a payment method. The payment methods displayed are those provided to the [CheckoutProvider](#checkoutprovider).

### makeErrorResponse

An action creator function to be used by a [payment processor function](#payment-methods) for a [ERROR](#PaymentProcessorResponseType) response. It takes one string argument and will record the string as the error.

### makeManualResponse

An action creator function to be used by a [payment processor function](#payment-methods) for a [MANUAL](#PaymentProcessorResponseType) response; it will do nothing but pass along its argument as a `payload` property to the resolved Promise of the `onClick` function.

### makeRedirectResponse

An action creator function to be used by a [payment processor function](#payment-methods) for a [REDIRECT](#PaymentProcessorResponseType) response. It takes one string argument and will cause the page to redirect to the URL in that string.

### makeSuccessResponse

An action creator function to be used by a [payment processor function](#payment-methods) for a [SUCCESS](#PaymentProcessorResponseType) response. It takes one object argument which is the transaction response. It will cause checkout to mark the payment as complete and run the `onPaymentComplete` function on the [CheckoutProvider](#CheckoutProvider).

### useAllPaymentMethods

A React Hook that will return an array of all payment method objects. See `usePaymentMethod()`, which returns the active object only. Only works within [CheckoutProvider](#CheckoutProvider).

### useFormStatus

A React Hook that will return an object with the following properties. Used to represent and change the current status of the checkout form (eg: causing it to be disabled). This differs from the status of the transaction itself, which is handled by [useTransactionStatus](#useTransactionStatus).

- `formStatus: `[`FormStatus`](#FormStatus). The current status of the form.
- `setFormReady: () => void`. Function to change the form status to [`.READY`](#FormStatus).
- `setFormLoading: () => void`. Function to change the form status to [`.LOADING`](#FormStatus).
- `setFormValidating: () => void`. Function to change the form status to [`.VALIDATING`](#FormStatus).
- `setFormSubmitting: () => void`. Function to change the form status to [`.SUBMITTING`](#FormStatus). Usually you can use [setTransactionPending](#useTransactionStatus) instead, which will call this.
- `setFormComplete: () => void`. Function to change the form status to [`.COMPLETE`](#FormStatus). Note that this will trigger `onPaymentComplete` from [CheckoutProvider](#CheckoutProvider). Usually you can use [setTransactionComplete](#useTransactionStatus) instead, which will call this.

Only works within [CheckoutProvider](#CheckoutProvider) which may sometimes change the status itself based on its props.

### useIsStepActive

A React Hook that will return true if the current step is the currently active step. Only works within a step.

### useIsStepComplete

A React Hook that will return true if the current step is complete as defined by the `isCompleteCallback` of that step. Only works within a step.

### useLineItems

A React Hook that will return a two element array where the first element is the current array of line items (matching the `items` from the `CheckoutProvider`), and the second element is the current total (matching the `total` from the `CheckoutProvider`). Only works within [CheckoutProvider](#CheckoutProvider).

### useLineItemsOfType

A React Hook taking one string argument that will return an array of [line items](#line-items) from the cart (derived from the same data returned by [useLineItems](#useLineItems)) whose `type` property matches that string. Only works within [CheckoutProvider](#CheckoutProvider).

### usePaymentMethod

A React Hook that will return an object containing all the information about the currently selected payment method (or null if none is selected). The most relevant property is probably `id`, which is a string identifying whatever payment method was entered in the payment method step. Only works within [CheckoutProvider](#CheckoutProvider).

### usePaymentMethodId

A React Hook that will return a two element array. The first element is a string representing the currently selected payment method (or null if none is selected). The second element is a function that will replace the currently selected payment method. Only works within [CheckoutProvider](#CheckoutProvider).

### usePaymentProcessor

A React Hook that returns a payment processor function as passed to the `paymentProcessors` prop of [CheckoutProvider](#CheckoutProvider). Takes one argument which is the key of the processor function to return. Throws an Error if the key does not match a processor function. See [Payment Methods](#payment-methods) for an explanation of how this is used. Only works within [CheckoutProvider](#CheckoutProvider).

### usePaymentProcessors

A React Hook that returns all the payment processor functions in a Record.

### useProcessPayment

A React Hook that will return the `onClick` function passed to each [payment method's submitButton component](#payment-methods). The hook requires a payment processor ID. Call the returned function with data for the payment processor and it will begin the transaction.

### useSetStepComplete

A React Hook that will return a function to set a step to "complete". Only works within a step but it does not have to be the targeted step. The returned function looks like `( stepId: string ) => Promise< void >;`. Calling this function is similar to pressing the "Continue" button on the specified step; it will call the `isCompleteCallback` prop of the step and only succeed if the callback succeeds. In addition, all previous incomplete steps will be marked as complete in the same way, and the process will fail and stop at the first step whose `isCompleteCallback` fails.

### useTotal

A React Hook that returns the `total` property provided to the [CheckoutProvider](#checkoutprovider). This is the same as the second return value of [useLineItems](#useLineItems) but may be more semantic in some cases. Only works within `CheckoutProvider`.

### useTransactionStatus

A React Hook that returns an object with the following properties to be used by [payment methods](#payment-methods) for storing and communicating the current status of the transaction. This differs from the current status of the _form_, which is handled by [useFormStatus](#useFormStatus). Note, however, that [CheckoutProvider](#CheckoutProvider) will automatically perform certain actions when the transaction status changes. See [CheckoutProvider](#CheckoutProvider) for the details.

- `transactionStatus: `[`TransactionStatus`](#TransactionStatus). The current status of the transaction.
- `previousTransactionStatus: `[`TransactionStatus.`](#TransactionStatus). The last status of the transaction.
- `transactionError: string | null`. The most recent error message encountered by the transaction if its status is [`.ERROR`](#TransactionStatus).
- `transactionRedirectUrl: string | null`. The redirect url to use if the transaction status is [`.REDIRECTING`](#TransactionStatus).
- `transactionLastResponse: unknown | null`. The most recent full response object as returned by the transaction's endpoint and passed to `setTransactionComplete`.
- `resetTransaction: () => void`. Function to change the transaction status to [`.NOT_STARTED`](#TransactionStatus).
- `setTransactionComplete: ( transactionResponse: unknown ) => void`. Function to change the transaction status to [`.COMPLETE`](#TransactionStatus) and save the response object in `transactionLastResponse`.
- `setTransactionError: ( string ) => void`. Function to change the transaction status to [`.ERROR`](#TransactionStatus) and save the error in `transactionError`.
- `setTransactionPending: () => void`. Function to change the transaction status to [`.PENDING`](#TransactionStatus).
- `setTransactionRedirecting: ( string ) => void`. Function to change the transaction status to [`.REDIRECTING`](#TransactionStatus) and save the redirect URL in `transactionRedirectUrl`.

## Development

In the root of the monorepo, run `yarn workspace @automattic/composite-checkout run storybook` which will start a local webserver that will display the component.

To run the tests for this package, run `yarn run test-packages composite-checkout`.
