import { OTPInput, OTPInputContext } from "input-otp";
import * as React from "react";
import styles from "./OTPInput.module.css";

const InputOTP = React.forwardRef<
	React.ElementRef<typeof OTPInput>,
	React.ComponentPropsWithoutRef<typeof OTPInput>
>(({ ...props }, ref) => (
	<OTPInput
		ref={ref}
		containerClassName={styles["otp-container"]}
		className={styles.otp}
		{...props}
	/>
));
InputOTP.displayName = "InputOTP";

const InputOTPGroup = React.forwardRef<
	React.ElementRef<"div">,
	React.ComponentPropsWithoutRef<"div">
>(({ className, ...props }, ref) => (
	<div ref={ref} className={styles["otp-group"]} {...props} />
));
InputOTPGroup.displayName = "InputOTPGroup";

const InputOTPSlot = React.forwardRef<
	React.ElementRef<"div">,
	React.ComponentPropsWithoutRef<"div"> & { index: number }
>(({ index, ...props }, ref) => {
	const inputOTPContext = React.useContext(OTPInputContext);
	const slot = inputOTPContext.slots[index];
	if (!slot) throw new Error("Invalid slot index");
	const { char, hasFakeCaret } = slot;

	return (
		<div ref={ref} className={styles["otp-slot"]} {...props}>
			{char}
			{hasFakeCaret && (
				<div className={styles["otp-caret-container"]}>
					<div className={styles["otp-caret"]} />
				</div>
			)}
		</div>
	);
});
InputOTPSlot.displayName = "InputOTPSlot";

const InputOTPSeparator = React.forwardRef<
	React.ElementRef<"div">,
	React.ComponentPropsWithoutRef<"div">
>(({ ...props }, ref) => (
	<div className="otp-separator" ref={ref} {...props}>
		-
	</div>
));
InputOTPSeparator.displayName = "InputOTPSeparator";

export { InputOTP, InputOTPGroup, InputOTPSlot, InputOTPSeparator };
