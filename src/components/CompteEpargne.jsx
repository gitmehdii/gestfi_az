import React, { useState, useEffect, useContext } from 'react';
import { Link } from 'react-router-dom';
import { AuthContext } from '../contexts/AuthContext';
import { apiService } from '../services/api';
import './CompteEpargne.css';

const CompteEpargne = ({ showBackLink = true }) => {
    const { user } = useContext(AuthContext);
    const [compteEpargne, setCompteEpargne] = useState(null);
    const [amount, setAmount] = useState('');
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            setError('');
            try {
                if (!user?.id) {
                    setError("Impossible de déterminer votre identifiant utilisateur. Veuillez vous reconnecter.");
                    setCompteEpargne({ valeur: 0 });
                    return;
                }

                // Utiliser directement apiService sans passer le token manuellement
                const data = await apiService.getCompteEpargneByUserId(user.id);
                const normalized = (data && typeof data === 'object' && 'valeur' in data) ? data : { valeur: Number(data ?? 0) };
                setCompteEpargne(normalized);
            } catch (error) {
                setError("Échec de récupération du compte épargne: " + error.message);
                console.error(error);
                setCompteEpargne({ valeur: 0 });
            } finally {
                setLoading(false);
            }
        };

        if (user) {
            fetchData();
        } else {
            setLoading(false);
        }
    }, [user]);

    const validateAmount = () => {
        const n = Number(amount);
        if (!amount || isNaN(n) || n === 0) {
            setError('Veuillez entrer un montant non nul (positif pour ajouter, négatif pour retirer).');
            return null;
        }
        return n;
    };

    const handleSubmit = async (e) => {
        e?.preventDefault?.();
        setError('');
        setMessage('');
        const n = validateAmount();
        if (n == null) return;

        try {
            if (!user?.id) {
                setError("Utilisateur non valide. Veuillez vous reconnecter.");
                return;
            }

            let updated;
            if (n > 0) {
                updated = await apiService.addValueToCompteEpargne(user.id, n);
                setMessage("Montant ajouté avec succès !");
            } else {
                updated = await apiService.removeValueFromCompteEpargne(user.id, Math.abs(n));
                setMessage("Montant retiré avec succès !");
            }

            const normalized = (updated && typeof updated === 'object' && 'valeur' in updated) ? updated : { valeur: Number(updated ?? 0) };
            setCompteEpargne(normalized);
            setAmount('');
        } catch (error) {
            setError("Échec de l'opération sur le compte épargne: " + error.message);
            console.error(error);
        }
    };

    const balance = Number(compteEpargne?.valeur ?? 0);

    return (
        <div className="compte-epargne-container">
            {showBackLink && (
                <Link to="/dashboard" className="back-button">← Retour au tableau de bord</Link>
            )}
            <h2>Compte épargne</h2>
            {loading && <div>Chargement du compte épargne...</div>}
            {error && <p className="error">{error}</p>}
            {message && <p className="message">{message}</p>}
            {!loading && (
                <>
                    <div className="compte-epargne-details">
                        <h3>Solde actuel</h3>
                        <p className={`balance ${balance < 0 ? 'negative' : ''}`}>{balance.toFixed(2)} €</p>
                    </div>
                    <form onSubmit={handleSubmit} className="add-value-form">
                        <h3>Mouvement</h3>
                        <div className="form-group">
                            <label htmlFor="amount">Montant (ex: 10 ou -10) :</label>
                            <input
                                type="number"
                                id="amount"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                placeholder="Saisir un montant (positif ou négatif)"
                                step="0.01"
                            />
                        </div>
                        <div className="form-actions">
                            <button type="submit">Valider</button>
                        </div>
                    </form>
                </>
            )}
        </div>
    );
};

export default CompteEpargne;
