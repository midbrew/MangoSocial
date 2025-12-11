import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

function App() {
    const navigate = useNavigate()

    useEffect(() => {
        // TODO: Check if user is authenticated
        const isAuthenticated = false;

        if (!isAuthenticated) {
            navigate('/login');
        }
    }, [navigate])

    return (
        <div className="min-h-screen bg-gray-100 flex items-center justify-center">
            <div className="animate-pulse flex flex-col items-center">
                <div className="h-12 w-12 bg-orange-500 rounded-full mb-4"></div>
                <div className="h-4 w-32 bg-gray-300 rounded"></div>
            </div>
        </div>
    )
}

export default App
