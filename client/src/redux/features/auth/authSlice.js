import { createSlice } from "@reduxjs/toolkit";
import { getCurrentUser, userLogin, userRegister } from "./authActions";

const token = localStorage.getItem('token') ? localStorage.getItem('token') : null;
let cachedUser = null;
try {
  cachedUser = JSON.parse(localStorage.getItem('user') || 'null');
} catch {
  cachedUser = null;
}

const initialState = {
  loading: false,
  user: cachedUser,
  token,
  error: null,
};

const authSlice = createSlice({
  name: "auth",
  initialState: initialState,
  reducers: {
    updateCurrentUser: (state, { payload }) => {
      state.user = { ...(state.user || {}), ...(payload || {}) };
      localStorage.setItem('user', JSON.stringify(state.user));
    },
  },
  extraReducers: (builder) => {
    //Login user
    builder.addCase(userLogin.pending, (state) => {
      state.loading = true;
      state.error = null;
    });

    builder.addCase(userLogin.fulfilled, (state, { payload }) => {
      state.loading = false;
      state.user = payload?.user || null;
      state.token = payload?.token || null;
      localStorage.setItem('user', JSON.stringify(state.user));
    });

    builder.addCase(userLogin.rejected, (state, { payload }) => {
      state.loading = false;
      state.error = payload;
    });

    //Register user
    builder.addCase(userRegister.pending, (state) => {
      state.loading = true;
      state.error = null;
    });

    builder.addCase(userRegister.fulfilled, (state, { payload }) => {
      state.loading = false;
      state.success = true;
      state.user = payload?.user || null;
      localStorage.setItem('user', JSON.stringify(state.user));
    });

    builder.addCase(userRegister.rejected, (state, { payload }) => {
      state.loading = false;
      state.error = payload;
    });

    //Current user
    builder.addCase(getCurrentUser.pending, (state) => {
      state.loading = true;
      state.error = null;
    });

    builder.addCase(getCurrentUser.fulfilled, (state, { payload }) => {
      state.loading = false;
      state.success = true;
      state.user = payload?.user || null;
      localStorage.setItem('user', JSON.stringify(state.user));
    });

    builder.addCase(getCurrentUser.rejected, (state, { payload }) => {
      state.loading = false;
      state.error = payload;
    });

  },
});

export const { updateCurrentUser } = authSlice.actions;
export default authSlice;
