import React from 'react'
import Form from '../../components/shared/Form/Form'
import { useSelector } from 'react-redux'
import { DNA } from 'react-loader-spinner'

const Register = () => {
  const { loading, error } = useSelector(state => state.auth)
  return (
    <div style={{ minHeight: '100vh', display: 'flex' }}>
      {/* Left — form panel */}
      <div style={{
        width: '100%',
        maxWidth: '520px',
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        padding: '40px 48px',
        background: '#fff',
        zIndex: 1,
        boxShadow: '2px 0 16px rgba(0,0,0,0.07)'
      }}>
        <img src="./assets/logo.png" alt="Blood Bridge" style={{ width: 120, marginBottom: 24 }} />
        {error && <div className="alert alert-danger py-2">{error}</div>}
        {loading ? (
          <div className="d-flex justify-content-center">
            <DNA visible height="200" width="200" ariaLabel="dna-loading" />
          </div>
        ) : (
          <Form formTitle="Register" submitBtn="Register" formType="register" />
        )}
      </div>

      {/* Right — banner image */}
      <div style={{ flex: 1, position: 'relative' }} className="d-none d-md-block">
        <img
          src="./assets/banner2.jpg"
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
          <h2 style={{ fontWeight: 800 }}>Join Blood Bridge.</h2>
          <p style={{ fontSize: 18 }}>Be the bridge between life and hope.</p>
        </div>
      </div>
    </div>
  )
}

export default Register
