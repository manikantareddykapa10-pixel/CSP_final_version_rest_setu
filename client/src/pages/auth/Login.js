import React from 'react'
import Form from '../../components/shared/Form/Form'
import { useSelector } from 'react-redux'
import { DNA } from 'react-loader-spinner'

const Login = () => {
  const { loading } = useSelector(state => state.auth)
  return (
    <div style={{ minHeight: '100vh', display: 'flex' }}>
      {/* Left — form panel */}
      <div style={{
        width: '100%',
        maxWidth: '480px',
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        padding: '40px 48px',
        background: '#fff',
        zIndex: 1,
        boxShadow: '2px 0 16px rgba(0,0,0,0.07)'
      }}>
        <img src="./assets/logo.png" alt="Blood Bridge" style={{ width: 120, marginBottom: 32 }} />
        {loading ? (
          <div className="d-flex justify-content-center">
            <DNA visible height="200" width="200" ariaLabel="dna-loading" />
          </div>
        ) : (
          <Form formTitle="Log In" submitBtn="Login" formType="login" />
        )}
      </div>

      {/* Right — banner image */}
      <div style={{ flex: 1, position: 'relative', display: 'none' }} className="d-none d-md-block">
        <img
          src="./assets/banner1.jpg"
          alt="Blood donation"
          style={{
            position: 'absolute', top: 0, left: 0,
            width: '100%', height: '100%',
            objectFit: 'cover', objectPosition: 'center'
          }}
        />
        <div style={{
          position: 'absolute', bottom: 40, left: 40, right: 40,
          color: 'white',
          textShadow: '0 2px 8px rgba(0,0,0,0.7)'
        }}>
          <h2 style={{ fontWeight: 800 }}>Every drop counts.</h2>
          <p style={{ fontSize: 18 }}>Connect donors, hospitals, and organisations — in real time.</p>
        </div>
      </div>
    </div>
  )
}

export default Login
