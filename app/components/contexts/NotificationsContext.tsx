import {
	createContext,
	useContext,
	useReducer,
	type PropsWithChildren,
} from "react";
import type { NotificationGroupInit } from "../forms/NotificationGroup";

export interface NotificationAction {
	type: "added" | "changed" | "deleted" | "submitted";
	notification: NotificationGroupInit;
	newId?: string;
}

export interface NotificationsState {
	notifications: NotificationGroupInit[];
}

const NotificationsContext = createContext<NotificationsState>({
	notifications: [],
});
const NotificationsDispatchContext = createContext<{
	dispatch: (action: NotificationAction) => void;
}>({
	dispatch: () => {},
});

interface ProviderProps extends PropsWithChildren {
	initial: NotificationsState;
}

export const NotificationsProvider = ({ initial, children }: ProviderProps) => {
	const [notifications, dispatch] = useReducer(notificationsReducer, initial);

	return (
		<NotificationsContext.Provider value={notifications}>
			<NotificationsDispatchContext.Provider value={{ dispatch }}>
				{children}
			</NotificationsDispatchContext.Provider>
		</NotificationsContext.Provider>
	);
};

export const useNotifications = () => {
	return useContext(NotificationsContext);
};

export const useNotificationsDispatch = () => {
	return useContext(NotificationsDispatchContext);
};

function notificationsReducer(
	state: NotificationsState,
	action: NotificationAction,
): NotificationsState {
	switch (action.type) {
		case "added": {
			return {
				notifications: [
					...state.notifications,
					{
						...action.notification,
					},
				],
			};
		}
		case "changed": {
			return {
				notifications: state.notifications.map((t) => {
					if (t.id === action.notification.id) {
						return action.notification;
					}
					return t;
				}),
			};
		}
		case "deleted": {
			return {
				notifications: state.notifications.filter(
					(t) => t.id !== action.notification.id,
				),
			};
		}
		case "submitted": {
			return {
				notifications: state.notifications.map((t) => {
					if (t.id === action.notification.id) {
						return {
							...action.notification,
							saved: true,
						};
					}
					return t;
				}),
			};
		}
		default: {
			return {
				notifications: state.notifications,
			};
		}
	}
}
