/**
 * Banner shown when a new version is available
 */

import { useVersionCheck } from "../hooks/useVersionCheck";
import styles from "./UpdateBanner.module.css";

export function UpdateBanner() {
	const { updateAvailable, applyUpdate, dismissUpdate } = useVersionCheck();

	if (!updateAvailable) {
		return null;
	}

	return (
		<div className={styles.banner}>
			<span className={styles.message}>New version available!</span>
			<div className={styles.actions}>
				<button type="button" className={styles.updateBtn} onClick={applyUpdate}>
					Update
				</button>
				<button type="button" className={styles.dismissBtn} onClick={dismissUpdate}>
					Later
				</button>
			</div>
		</div>
	);
}
