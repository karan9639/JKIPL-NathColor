import { configureStore, createSlice } from '@reduxjs/toolkit';
import { session } from '@/services/auth/session';

const authSlice = createSlice({
    name: 'auth',
    initialState: {
        username: session.getUsername(),
        user: session.getUser(),
        isLoggingOut: false,
    },
    reducers: {
        signedIn(state, action) {
            state.username = action.payload.username;
            state.user = action.payload.user;
            state.isLoggingOut = false;
        },
        logoutStarted(state) { state.isLoggingOut = true; },
        signedOut(state) {
            state.username = '';
            state.user = null;
            state.isLoggingOut = false;
        },
    },
});
const uiSlice = createSlice({
    name: 'ui',
    initialState: { navigationOpen: false },
    reducers: {
        navigationChanged(state, action) { state.navigationOpen = action.payload; },
    },
    extraReducers: (builder) => {
        builder.addCase(authSlice.actions.signedOut, (state) => { state.navigationOpen = false; });
    },
});
export const { signedIn, logoutStarted, signedOut } = authSlice.actions;
export const { navigationChanged } = uiSlice.actions;
export const store = configureStore({
    reducer: { auth: authSlice.reducer, ui: uiSlice.reducer },
    devTools: import.meta.env.DEV,
});
