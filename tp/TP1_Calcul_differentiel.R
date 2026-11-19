# TP 1 - Chapitre 2 - Analyse L1 tronc commun (2MTH1 0101)
# Enseignant : M. Bakary TRAORE - Universite de N'Zerekore
# Execution : source("TP1_Calcul_differentiel.R") ; aucun package requis.

f <- function(x) x^3 - 3*x
fprime <- function(x) 3*x^2 - 3
fseconde <- function(x) 6*x
d_centre <- function(x, h) (f(x + h) - f(x - h)) / (2*h)

# Derivee numerique au point 0.5, avec comparaison a la valeur analytique.
h <- c(0.5, 0.1, 0.01)
comparaison <- data.frame(
  x = 0.5, h = h,
  derivee_numerique = vapply(h, function(pas) d_centre(0.5, pas), numeric(1)),
  derivee_exacte = fprime(0.5)
)
comparaison$erreur_absolue <- abs(comparaison$derivee_numerique - comparaison$derivee_exacte)
print(comparaison, row.names = FALSE)

# Graphe des fonctions et extrema analytiques (graphique dans le panneau R).
x <- seq(-2, 2, length.out = 401)
plot(x, f(x), type = "l", lwd = 2, col = "#176D8E",
     xlab = "x", ylab = "Valeur", main = "Calcul differentiel : f et f'")
lines(x, fprime(x), lwd = 2, col = "#118F86", lty = 2)
abline(h = 0, col = "gray70")
points(c(-1, 1), f(c(-1, 1)), pch = 19, col = "#D57931")
legend("bottomright", legend = c("f(x)=x^3-3x", "f'(x)=3x^2-3", "extrema locaux"),
       col = c("#176D8E", "#118F86", "#D57931"),
       lty = c(1, 2, NA), pch = c(NA, NA, 19), bty = "n")

# Developpement limite d'ordre 2 en a=1.
h_taylor <- c(0.2, 0.1, 0.05)
p2 <- function(h) -2 + 3*h^2
approximation <- data.frame(
  h = h_taylor,
  valeur_exacte = f(1 + h_taylor),
  taylor_ordre_2 = p2(h_taylor)
)
approximation$erreur_absolue <- abs(approximation$valeur_exacte - approximation$taylor_ordre_2)
approximation$erreur_sur_h_cube <- approximation$erreur_absolue / abs(h_taylor)^3
print(approximation, row.names = FALSE)

# A discuter : ici l'erreur est exactement |h|^3 ; le resultat vient du polynome choisi.
