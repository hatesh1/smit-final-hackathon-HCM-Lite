import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth, homePathFor } from '../../context/AuthContext';
import { Button, Input, Field, Alert } from '../../components/ui';
import { Building2, ShieldCheck, Clock, ArrowRight } from 'lucide-react';

export default function SetupWizard() {
  const { firstRunSetup } = useAuth();
  const navigate = useNavigate();

  const [companyName, setCompanyName] = useState('');
  const [officeStart, setOfficeStart] = useState('09:00');
  const [graceMinutes, setGraceMinutes] = useState(15);
  const [halfDayHours, setHalfDayHours] = useState(5);
  const [lat, setLat] = useState('');
  const [lng, setLng] = useState('');
  const [radiusMeters, setRadiusMeters] = useState(150);
  const [address, setAddress] = useState('');

  const [adminName, setAdminName] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');

  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const user = await firstRunSetup({
        companyName,
        officeStart,
        graceMinutes: Number(graceMinutes),
        halfDayHours: Number(halfDayHours),
        officeLocation: {
          lat: Number(lat),
          lng: Number(lng),
          radiusMeters: Number(radiusMeters),
          address,
        },
        adminName,
        adminEmail,
        adminPassword,
      });
      navigate(homePathFor(user), { replace: true });
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Setup failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col justify-center py-12 sm:px-6 lg:px-8 text-slate-100">
      <div className="sm:mx-auto sm:w-full sm:max-w-2xl">
        <div className="flex justify-center mb-4">
          <div className="h-16 w-16 rounded-2xl bg-indigo-600 flex items-center justify-center shadow-xl shadow-indigo-600/30">
            <Building2 className="h-9 w-9 text-black" />
          </div>
        </div>
        <h2 className="text-center text-white text-3xl font-extrabold text-black tracking-tight">
          Welcome to HCM Lite
        </h2>
        <p className="mt-2 text-center text-white text-sm text-slate-400">
          First-Run Setup · Initialize your Organization, Office Rules, and Admin Account
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-2xl">
        <div className="bg-slate-800 py-8 px-4 shadow-2xl sm:rounded-2xl sm:px-10 border border-slate-700">
          <form className="space-y-6" onSubmit={handleSubmit}>
            {error && <Alert kind="error">{error}</Alert>}

            {/* Section 1: Company Profile */}
            <div>
              <h3 className="text-base font-semibold text-white flex items-center gap-2 border-b border-slate-700 pb-2">
                <Building2 className="h-4 w-4 text-indigo-400" />
                1. Company Profile
              </h3>
              <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <Field label="Company Name" className="text-white">
                    <Input
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      placeholder="Your Company Name"
                      required
                      className="bg-slate-900 border-slate-700 text-black"
                    />
                  </Field>
                </div>
                <div className="sm:col-span-2">
                  <Field label="Head Office Address">
                    <Input
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      placeholder="Office address"
                      className="bg-slate-900 border-slate-700 text-black"
                    />
                  </Field>
                </div>
              </div>
            </div>

            {/* Section 2: Attendance Rules */}
            <div>
              <h3 className="text-base font-semibold text-white flex items-center gap-2 border-b border-slate-700 pb-2">
                <Clock className="h-4 w-4 text-indigo-400" />
                2. Timing & Location
              </h3>
              {/* /* <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
                <Field label="Office Start Time">
                  <Input
                    type="time"
                    value={officeStart}
                    onChange={(e) => setOfficeStart(e.target.value)}
                    required
                    className="bg-slate-900 border-slate-700 text-black"
                  />
                </Field>
                {/* <Field label="Grace Period (Minutes)">
                  <Input
                    type="number"
                    value={graceMinutes}
                    onChange={(e) => setGraceMinutes(e.target.value)}
                    required
                    className="bg-slate-900 border-slate-700 text-black"
                  />
                </Field> */}
                {/* <Field label="Half-Day Threshold (Hours)">
                  <Input
                    type="number"
                    value={halfDayHours}
                    onChange={(e) => setHalfDayHours(e.target.value)}
                    required
                    className="bg-slate-900 border-slate-700 text-black"
                  />
                </Field> */}
              {/* </div> */}
              <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">

                  <Field label="Office Start Time">
                  <Input
                    type="time"
                    value={officeStart}
                    onChange={(e) => setOfficeStart(e.target.value)}
                    required
                    className="bg-slate-900 border-slate-700 text-black"
                  />
                </Field>

                <Field label="Office GPS Latitude">
                  <Input
                    type="number"
                    step="0.0001"
                    value={lat}
                    onChange={(e) => setLat(e.target.value)}
                    placeholder="e.g. 24.8607"
                    required
                    className="bg-slate-900 border-slate-700 text-black"
                  />
                </Field>
                <Field label="Office GPS Longitude">
                  <Input
                    type="number"
                    step="0.0001"
                    value={lng}
                    onChange={(e) => setLng(e.target.value)}
                    placeholder="e.g. 67.0011"
                    required
                    className="bg-slate-900 border-slate-700 text-black"
                  />
                </Field>
                {/* <Field label="Geofence Radius (Meters)">
                  <Input
                    type="number"
                    value={radiusMeters}
                    onChange={(e) => setRadiusMeters(e.target.value)}
                    required
                    className="bg-slate-900 border-slate-700 text-black"
                  />
                </Field> */}
              </div>
            </div>

            {/* Section 3: Admin Account */}
            <div>
              <h3 className="text-base font-semibold text-white flex items-center gap-2 border-b border-slate-700 pb-2">
                <ShieldCheck className="h-4 w-4 text-indigo-400" />
                3. Master Administrator Account
              </h3>
              <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
                <Field label="Admin Full Name">
                  <Input
                    value={adminName}
                    onChange={(e) => setAdminName(e.target.value)}
                    placeholder="Full Name"
                    required
                    className="bg-slate-900 border-slate-700 text-black"
                  />
                </Field>
                <Field label="Admin Email">
                  <Input
                    type="email"
                    value={adminEmail}
                    onChange={(e) => setAdminEmail(e.target.value)}
                    placeholder="admin@company.com"
                    required
                    className="bg-slate-900 border-slate-700 text-black"
                  />
                </Field>
                <Field label="Admin Password" className=" text-white ">
                  <Input
                    type="password"
                    value={adminPassword}
                    onChange={(e) => setAdminPassword(e.target.value)}
                    placeholder="Strong password"
                    required
                    className="bg-slate-900 border-slate-700 text-black"
                  />
                </Field>
              </div>
            </div>

            <div className="pt-4">
              <Button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center items-center gap-2 py-3 bg-indigo-600 hover:bg-indigo-500 text-black text-base font-semibold rounded-xl shadow-lg shadow-indigo-600/30"
              >
                <span>{loading ? 'Setting up...' : 'Complete Setup & Launch'}</span>
                <ArrowRight className="h-5 w-5" />
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
