import Foundation
import SwiftUI

struct WatchHeroCard: View {
    let stats: WatchDashboardStats?
    let user: WatchUserProfile
    let showsOpenProfileCTA: Bool

    init(
        stats: WatchDashboardStats?,
        user: WatchUserProfile,
        showsOpenProfileCTA: Bool = true
    ) {
        self.stats = stats
        self.user = user
        self.showsOpenProfileCTA = showsOpenProfileCTA
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack(alignment: .center, spacing: 10) {
                WatchAvatarView(
                    name: user.safeDisplayName,
                    picture: user.picture,
                    size: 38
                )

                VStack(alignment: .leading, spacing: 2) {
                    Text(user.safeDisplayName)
                        .font(.system(size: 13, weight: .semibold, design: .rounded))
                        .foregroundStyle(.white)
                        .lineLimit(2)
                        .minimumScaleFactor(0.75)

                    Text(user.safeSubtitle)
                        .font(.system(size: 9, weight: .medium, design: .rounded))
                        .foregroundStyle(.secondary)
                        .lineLimit(1)
                        .minimumScaleFactor(0.85)
                }
            }

            ViewThatFits(in: .horizontal) {
                HStack(spacing: 6) {
                    heroPills
                }

                VStack(alignment: .leading, spacing: 6) {
                    heroPills
                }
            }

            ViewThatFits(in: .horizontal) {
                HStack(spacing: 8) {
                    heroMetrics
                }

                VStack(alignment: .leading, spacing: 6) {
                    heroMetrics
                }
            }

            if showsOpenProfileCTA {
                HStack(spacing: 5) {
                    Text("Abrir perfil")
                        .font(.system(size: 8.6, weight: .bold, design: .rounded))
                        .foregroundStyle(.cyan)
                        .lineLimit(1)
                        .minimumScaleFactor(0.75)

                    Image(systemName: "chevron.right")
                        .font(.system(size: 8, weight: .heavy))
                        .foregroundStyle(.cyan.opacity(0.86))
                }
                .padding(.horizontal, 8)
                .padding(.vertical, 5)
                .background(Color.cyan.opacity(0.14), in: Capsule())
                .overlay(
                    Capsule()
                        .stroke(Color.cyan.opacity(0.18), lineWidth: 1)
                )
            }
        }
        .padding(10)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(
            LinearGradient(
                colors: [
                    Color(hex: "#12203B"),
                    Color.black.opacity(0.86)
                ],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            ),
            in: RoundedRectangle(cornerRadius: 18, style: .continuous)
        )
    }

    @ViewBuilder
    private var heroPills: some View {
        WatchPill(text: clean(user.modeLabel) ?? "Modo normal", tone: .blue)
        WatchPill(text: clean(user.roleLabel) ?? "Usuario", tone: .purple)
    }

    @ViewBuilder
    private var heroMetrics: some View {
        WatchDebtMetricCard(value: clean(user.debtLabel) ?? "Sin deuda")
    }
}

struct WatchDebtMetricCard: View {
    let value: String

    var body: some View {
        VStack(alignment: .leading, spacing: 2) {
            Text("Deuda")
                .font(.system(size: 8.3, weight: .medium, design: .rounded))
                .foregroundStyle(Color(hex: "#ffb4aa").opacity(0.9))

            Text(value)
                .font(.system(size: 10.2, weight: .bold, design: .rounded))
                .foregroundStyle(Color(hex: "#fff1ee"))
                .lineLimit(3)
                .minimumScaleFactor(0.75)
        }
        .padding(8)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(
            LinearGradient(
                colors: [
                    Color(hex: "#42100f").opacity(0.96),
                    Color(hex: "#2a0d0c").opacity(0.92)
                ],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            ),
            in: RoundedRectangle(cornerRadius: 14, style: .continuous)
        )
        .overlay(
            RoundedRectangle(cornerRadius: 14, style: .continuous)
                .stroke(Color(hex: "#ff6b5f").opacity(0.32), lineWidth: 1)
        )
    }
}

struct WatchRechargeBalanceCard: View {
    let balance: WatchRechargeBalanceSnapshot
    let onRefresh: () -> Void

    private var amountLabel: String {
        let formatter = NumberFormatter()
        formatter.locale = Locale(identifier: "es_ES")
        formatter.minimumFractionDigits = 2
        formatter.maximumFractionDigits = 2
        formatter.numberStyle = .decimal

        return formatter.string(from: NSNumber(value: balance.amount ?? 0)) ?? "0,00"
    }

    private var currencyLabel: String {
        clean(balance.currency)?.uppercased() ?? "USD"
    }

    private var updatedLabel: String {
        guard let rawDate = clean(balance.updatedAt),
              let date = ISO8601DateFormatter().date(from: rawDate) else {
            return "Actualizado ahora"
        }

        let formatter = DateFormatter()
        formatter.locale = Locale(identifier: "es_ES")
        formatter.timeStyle = .short
        return "Actualizado: \(formatter.string(from: date))"
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 7) {
            Rectangle()
                .fill(Color(hex: "#ff5aa6"))
                .frame(height: 3)
                .clipShape(Capsule())

            HStack(alignment: .top, spacing: 6) {
                VStack(alignment: .leading, spacing: 2) {
                    Text("Saldo Disponible Recargas")
                        .font(.system(size: 10.4, weight: .semibold, design: .rounded))
                        .foregroundStyle(Color(hex: "#17121f"))
                        .lineLimit(2)
                        .minimumScaleFactor(0.76)

                    Text(updatedLabel)
                        .font(.system(size: 7.3, weight: .medium, design: .rounded))
                        .foregroundStyle(Color(hex: "#41394f").opacity(0.82))
                        .lineLimit(1)
                        .minimumScaleFactor(0.72)
                }

                Spacer(minLength: 4)

                Button(action: onRefresh) {
                    Image(systemName: "arrow.clockwise")
                        .font(.system(size: 10, weight: .semibold))
                        .foregroundStyle(Color(hex: "#31283d"))
                        .frame(width: 22, height: 22)
                }
                .buttonStyle(.plain)
                .accessibilityLabel("Actualizar saldo")
            }

            HStack(alignment: .firstTextBaseline, spacing: 2) {
                Spacer(minLength: 0)

                Text(amountLabel)
                    .font(.system(size: 18.6, weight: .bold, design: .rounded))
                    .foregroundStyle(Color(hex: "#17121f"))
                    .lineLimit(1)
                    .minimumScaleFactor(0.65)

                Text(currencyLabel)
                    .font(.system(size: 8.4, weight: .bold, design: .rounded))
                    .foregroundStyle(Color(hex: "#17121f").opacity(0.9))
                    .lineLimit(1)
                    .minimumScaleFactor(0.7)

                Spacer(minLength: 0)
            }
            .padding(.top, 2)

            HStack {
                Spacer(minLength: 0)

                HStack(spacing: 3) {
                    Image(systemName: "clock.arrow.circlepath")
                        .font(.system(size: 7.3, weight: .bold))

                    Text("Auto cada 60s")
                        .font(.system(size: 7.8, weight: .bold, design: .rounded))
                        .lineLimit(1)
                        .minimumScaleFactor(0.7)
                }
                .foregroundStyle(Color(hex: "#0a5ca8"))
                .padding(.horizontal, 7)
                .padding(.vertical, 4)
                .background(Color(hex: "#e5f2ff"), in: Capsule())

                Spacer(minLength: 0)
            }
        }
        .padding(.horizontal, 10)
        .padding(.bottom, 9)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(
            LinearGradient(
                colors: [
                    Color(hex: "#d7d0e8"),
                    Color(hex: "#cfc7df")
                ],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            ),
            in: RoundedRectangle(cornerRadius: 16, style: .continuous)
        )
        .overlay(
            RoundedRectangle(cornerRadius: 16, style: .continuous)
                .stroke(Color.white.opacity(0.18), lineWidth: 1)
        )
    }
}

struct QuickStatsStrip: View {
    let approvalsCount: Int
    let debtorsCount: Int
    let userCount: Int

    var body: some View {
        ViewThatFits(in: .horizontal) {
            HStack(spacing: 8) {
                WatchStatCard(icon: "person.2.fill", title: "Usuarios", value: "\(userCount)")
                WatchStatCard(icon: "banknote.fill", title: "Deuda", value: "\(debtorsCount)")
                WatchStatCard(icon: "tray.full.fill", title: "Pendientes", value: "\(approvalsCount)")
            }

            VStack(spacing: 6) {
                WatchStatCard(icon: "person.2.fill", title: "Usuarios", value: "\(userCount)")
                WatchStatCard(icon: "banknote.fill", title: "Deuda", value: "\(debtorsCount)")
                WatchStatCard(icon: "tray.full.fill", title: "Pendientes", value: "\(approvalsCount)")
            }
        }
    }
}

struct WatchDebtOverviewCard: View {
    let debtors: [WatchDebtorSummary]
    let salesCount: Int
    let totalLabel: String

    private var visibleDebtors: [WatchDebtorSummary] {
        Array(debtors.prefix(4))
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack(alignment: .top, spacing: 8) {
                Image(systemName: "banknote.fill")
                    .font(.caption.weight(.semibold))
                    .foregroundStyle(.green)

                VStack(alignment: .leading, spacing: 2) {
                    Text("Te deben")
                        .font(.system(size: 10, weight: .semibold, design: .rounded))
                        .foregroundStyle(.white)
                        .lineLimit(1)

                    Text("\(debtors.count) usuario\(debtors.count == 1 ? "" : "s") · \(salesCount) venta\(salesCount == 1 ? "" : "s")")
                        .font(.system(size: 8.4, weight: .medium, design: .rounded))
                        .foregroundStyle(.secondary)
                        .lineLimit(2)
                        .minimumScaleFactor(0.78)
                }

                Spacer(minLength: 4)

                Text(totalLabel)
                    .font(.system(size: 11, weight: .bold, design: .rounded))
                    .foregroundStyle(.green)
                    .lineLimit(1)
                    .minimumScaleFactor(0.62)
            }

            ForEach(visibleDebtors, id: \.safeId) { debtor in
                HStack(spacing: 6) {
                    VStack(alignment: .leading, spacing: 1) {
                        Text(debtor.safeDisplayName)
                            .font(.system(size: 9.4, weight: .semibold, design: .rounded))
                            .foregroundStyle(.white)
                            .lineLimit(1)
                            .minimumScaleFactor(0.76)

                        Text("\(debtor.salesCount ?? 0) venta\((debtor.salesCount ?? 0) == 1 ? "" : "s")")
                            .font(.system(size: 8, weight: .medium, design: .rounded))
                            .foregroundStyle(.secondary)
                    }

                    Spacer(minLength: 4)

                    Text(clean(debtor.amountLabel) ?? "0 CUP")
                        .font(.system(size: 9.4, weight: .bold, design: .rounded))
                        .foregroundStyle(.white)
                        .lineLimit(1)
                        .minimumScaleFactor(0.7)
                }
                .padding(.vertical, 4)
                .padding(.horizontal, 7)
                .background(Color.white.opacity(0.055), in: RoundedRectangle(cornerRadius: 10, style: .continuous))
            }

            if debtors.count > visibleDebtors.count {
                Text("+\(debtors.count - visibleDebtors.count) más con deuda pendiente")
                    .font(.system(size: 8.4, weight: .medium, design: .rounded))
                    .foregroundStyle(.secondary)
                    .lineLimit(1)
                    .minimumScaleFactor(0.8)
            }
        }
        .padding(10)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(
            LinearGradient(
                colors: [Color.green.opacity(0.2), Color.white.opacity(0.055)],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            ),
            in: RoundedRectangle(cornerRadius: 18, style: .continuous)
        )
    }
}

struct WatchApprovalsOverviewCard: View {
    let approvals: [WatchApprovalSummary]

    private var readyCount: Int {
        approvals.filter { $0.canApproveSale == true }.count
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 7) {
            HStack(alignment: .top, spacing: 8) {
                Image(systemName: "checkmark.seal.fill")
                    .font(.caption.weight(.semibold))
                    .foregroundStyle(.orange)

                VStack(alignment: .leading, spacing: 2) {
                    Text("Aprobaciones")
                        .font(.system(size: 10, weight: .semibold, design: .rounded))
                        .foregroundStyle(.white)
                        .lineLimit(1)

                    Text("Ventas en efectivo pendientes de revisión")
                        .font(.system(size: 8.4, weight: .medium, design: .rounded))
                        .foregroundStyle(.secondary)
                        .lineLimit(2)
                        .minimumScaleFactor(0.78)
                }

                Spacer(minLength: 4)

                WatchPill(text: "\(approvals.count)", tone: .orange)
            }

            ViewThatFits(in: .horizontal) {
                HStack(spacing: 6) {
                    WatchMetricMini(title: "Listas", value: "\(readyCount)")
                    WatchMetricMini(title: "En espera", value: "\(max(approvals.count - readyCount, 0))")
                }

                VStack(alignment: .leading, spacing: 6) {
                    WatchMetricMini(title: "Listas", value: "\(readyCount)")
                    WatchMetricMini(title: "En espera", value: "\(max(approvals.count - readyCount, 0))")
                }
            }

            HStack(spacing: 5) {
                Text("Abrir pendientes")
                    .font(.system(size: 8.6, weight: .bold, design: .rounded))
                    .foregroundStyle(.orange)
                    .lineLimit(1)
                    .minimumScaleFactor(0.75)

                Image(systemName: "chevron.right")
                    .font(.system(size: 8, weight: .heavy))
                    .foregroundStyle(.orange.opacity(0.85))
            }
            .padding(.horizontal, 8)
            .padding(.vertical, 5)
            .background(Color.orange.opacity(0.15), in: Capsule())
            .overlay(
                Capsule()
                    .stroke(Color.orange.opacity(0.18), lineWidth: 1)
            )
        }
        .padding(10)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Color.orange.opacity(0.14), in: RoundedRectangle(cornerRadius: 18, style: .continuous))
    }
}

struct WatchPendingEvidenceOverviewCard: View {
    let summary: WatchPendingEvidenceSummary?

    private var count: Int {
        summary?.count ?? 0
    }

    private var visibleTypes: [WatchPendingEvidenceTypeSummary] {
        Array((summary?.types ?? []).prefix(3))
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 7) {
            HStack(alignment: .top, spacing: 8) {
                Image(systemName: "photo.badge.exclamationmark.fill")
                    .font(.caption.weight(.semibold))
                    .foregroundStyle(.cyan)

                VStack(alignment: .leading, spacing: 2) {
                    Text("Evidencias")
                        .font(.system(size: 11, weight: .semibold, design: .rounded))
                        .foregroundStyle(.white)
                        .lineLimit(1)

                    Text("Compras en efectivo esperando comprobante")
                        .font(.system(size: 9, weight: .medium, design: .rounded))
                        .foregroundStyle(.secondary)
                        .lineLimit(2)
                        .minimumScaleFactor(0.78)
                }

                Spacer(minLength: 4)

                WatchPill(text: "\(count)", tone: .blue)
            }

            if !visibleTypes.isEmpty {
                ViewThatFits(in: .horizontal) {
                    HStack(spacing: 5) {
                        typePills
                    }

                    VStack(alignment: .leading, spacing: 5) {
                        typePills
                    }
                }
            }
        }
        .padding(10)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Color.cyan.opacity(0.12), in: RoundedRectangle(cornerRadius: 18, style: .continuous))
    }

    @ViewBuilder
    private var typePills: some View {
        ForEach(visibleTypes) { type in
            WatchPill(
                text: "\(clean(type.label) ?? "Tipo") \(type.count ?? 0)",
                tone: .blue
            )
        }
    }
}

struct WatchSectionHeader: View {
    let title: String
    let count: Int

    var body: some View {
        HStack {
            Text(title)
                .font(.footnote.weight(.semibold))
                .foregroundStyle(.white)

            Spacer(minLength: 8)

            WatchPill(text: "\(count)", tone: .blue)
        }
        .padding(.top, 4)
        .frame(maxWidth: .infinity, alignment: .leading)
    }
}

struct WatchShortcutCard: View {
    var badge: String? = nil
    let icon: String
    let subtitle: String
    let title: String

    var body: some View {
        VStack(alignment: .leading, spacing: 9) {
            HStack(alignment: .top, spacing: 8) {
                ZStack {
                    RoundedRectangle(cornerRadius: 12, style: .continuous)
                        .fill(
                            LinearGradient(
                                colors: [Color.cyan.opacity(0.24), Color.blue.opacity(0.14)],
                                startPoint: .topLeading,
                                endPoint: .bottomTrailing
                            )
                        )
                        .frame(width: 34, height: 34)

                    Image(systemName: icon)
                        .font(.system(size: 15, weight: .semibold))
                        .foregroundStyle(.cyan)
                }
                .frame(width: 34, height: 34)
                .accessibilityHidden(true)

                VStack(alignment: .leading, spacing: 3) {
                    Text(title)
                        .font(.system(size: 11.5, weight: .semibold, design: .rounded))
                        .foregroundStyle(.white)
                        .lineLimit(2)
                        .fixedSize(horizontal: false, vertical: true)

                    Text(subtitle)
                        .font(.system(size: 9.3, weight: .medium, design: .rounded))
                        .foregroundStyle(.secondary)
                        .lineLimit(3)
                        .minimumScaleFactor(0.82)
                        .fixedSize(horizontal: false, vertical: true)
                }
                .layoutPriority(2)
            }

            ViewThatFits(in: .horizontal) {
                HStack(spacing: 6) {
                    footerBadge
                    Spacer(minLength: 4)
                    footerAction
                }

                VStack(alignment: .leading, spacing: 5) {
                    footerBadge
                    footerAction
                }
            }
        }
        .padding(10)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(
            LinearGradient(
                colors: [Color.white.opacity(0.085), Color.white.opacity(0.045)],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            ),
            in: RoundedRectangle(cornerRadius: 17, style: .continuous)
        )
        .overlay(
            RoundedRectangle(cornerRadius: 17, style: .continuous)
                .stroke(Color.white.opacity(0.06), lineWidth: 1)
        )
    }

    @ViewBuilder
    private var footerBadge: some View {
        if let badge {
            HStack(spacing: 4) {
                Image(systemName: "number.circle.fill")
                    .font(.system(size: 8.5, weight: .semibold))
                    .foregroundStyle(.cyan)

                Text(badge)
                    .font(.system(size: 9.5, weight: .bold, design: .rounded))
                    .foregroundStyle(.cyan)
                    .lineLimit(1)
                    .minimumScaleFactor(0.78)
                    .allowsTightening(true)
            }
            .padding(.horizontal, 7)
            .padding(.vertical, 4)
            .background(Color.cyan.opacity(0.14), in: Capsule())
        }
    }

    private var footerAction: some View {
        HStack(spacing: 4) {
            Text("Abrir")
                .font(.system(size: 9, weight: .semibold, design: .rounded))
                .foregroundStyle(.white.opacity(0.82))
                .lineLimit(1)

            Image(systemName: "chevron.right")
                .font(.system(size: 8, weight: .bold))
                .foregroundStyle(.white.opacity(0.58))
        }
        .padding(.horizontal, 7)
        .padding(.vertical, 4)
        .background(Color.white.opacity(0.075), in: Capsule())
    }
}

struct WatchUserRowCard: View {
    let user: WatchUserProfile

    private var hasProxyUsage: Bool {
        user.usage?.proxy?.enabled == true || user.usage?.proxy?.active == true
    }

    private var hasVpnUsage: Bool {
        user.usage?.vpn?.enabled == true || user.usage?.vpn?.active == true
    }

    private var hasDebt: Bool {
        (user.debtAmount ?? 0) > 0
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack(alignment: .top, spacing: 9) {
                WatchAvatarView(
                    name: user.safeDisplayName,
                    picture: user.picture,
                    size: 34
                )

                VStack(alignment: .leading, spacing: 3) {
                    Text(user.safeDisplayName)
                        .font(.caption.weight(.semibold))
                        .foregroundStyle(hasDebt ? Color(hex: "#fff4f2") : .white)
                        .lineLimit(1)
                        .minimumScaleFactor(0.7)
                        .allowsTightening(true)

                    Text(user.safeSubtitle)
                        .font(.system(size: 9.5, weight: .medium, design: .rounded))
                        .foregroundStyle(hasDebt ? Color(hex: "#ffd8d2").opacity(0.82) : .secondary)
                        .lineLimit(1)
                        .minimumScaleFactor(0.78)

                    HStack(spacing: 4) {
                        if user.isAdmin == true {
                            WatchPill(text: "Admin", tone: .purple)
                        }

                        if hasDebt {
                            Image(systemName: "exclamationmark.circle.fill")
                                .font(.system(size: 8.5, weight: .bold))
                                .foregroundStyle(Color(hex: "#ffd166"))
                        }

                        Text(clean(user.debtLabel) ?? "Sin deuda")
                            .font(.system(size: 9.5, weight: .semibold, design: .rounded))
                            .foregroundStyle(hasDebt ? Color(hex: "#ffd166") : Color(hex: "#9fd5ff"))
                            .lineLimit(1)
                            .minimumScaleFactor(0.74)
                    }
                    .frame(maxWidth: .infinity, alignment: .leading)
                }
                .layoutPriority(1)

                Spacer(minLength: 2)
            }

            if hasVpnUsage || hasProxyUsage {
                VStack(spacing: 6) {
                    if let vpn = user.usage?.vpn, hasVpnUsage {
                        WatchCompactUsageBar(
                            tint: .green,
                            title: "VPN",
                            usage: vpn
                        )
                    }

                    if let proxy = user.usage?.proxy, hasProxyUsage {
                        WatchCompactUsageBar(
                            tint: .blue,
                            title: "Proxy",
                            usage: proxy
                        )
                    }
                }
            } else {
                HStack(spacing: 6) {
                    WatchMiniUsageBadge(active: false, title: "VPN")
                    WatchMiniUsageBadge(active: false, title: "Proxy")
                }
            }
        }
        .padding(9)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(cardBackground)
        .overlay(cardBorder)
    }

    @ViewBuilder
    private var cardBackground: some View {
        if hasDebt {
            ZStack(alignment: .topTrailing) {
                LinearGradient(
                    colors: [
                        Color(hex: "#3a1017"),
                        Color(hex: "#7f1d2d").opacity(0.92),
                        Color(hex: "#1b0b12")
                    ],
                    startPoint: .topLeading,
                    endPoint: .bottomTrailing
                )

                Circle()
                    .fill(Color(hex: "#ff6b6b").opacity(0.22))
                    .frame(width: 72, height: 72)
                    .blur(radius: 12)
                    .offset(x: 22, y: -28)

                Circle()
                    .fill(Color(hex: "#ffd166").opacity(0.12))
                    .frame(width: 46, height: 46)
                    .blur(radius: 10)
                    .offset(x: -96, y: 42)
            }
            .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
        } else {
            Color.white.opacity(0.05)
                .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
        }
    }

    private var cardBorder: some View {
        RoundedRectangle(cornerRadius: 16, style: .continuous)
            .stroke(
                hasDebt ? Color(hex: "#ff8a80").opacity(0.28) : Color.white.opacity(0.04),
                lineWidth: 1
            )
    }
}

struct WatchCompactUsageBar: View {
    let tint: Color
    let title: String
    let usage: WatchUsageSnapshot

    private var isUnlimited: Bool {
        usage.isUnlimited == true
    }

    private var progress: Double {
        min(max(usage.progress ?? 0, 0), 1)
    }

    private var statusText: String {
        if isUnlimited,
           let unlimitedUsageLabel = clean(usage.unlimitedUsageLabel) {
            return unlimitedUsageLabel
        }

        return clean(usage.statusLabel) ?? clean(usage.usedLabel) ?? "Sin datos"
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            HStack(spacing: 6) {
                Text(title)
                    .font(.system(size: 9.5, weight: .bold, design: .rounded))
                    .foregroundStyle(.white)
                    .lineLimit(1)

                WatchPill(
                    text: usage.enabled == true ? "Activo" : "Off",
                    tone: usage.enabled == true ? .green : .gray
                )

                Spacer(minLength: 4)
            }

            if !isUnlimited {
                GeometryReader { proxy in
                    ZStack(alignment: .leading) {
                        Capsule()
                            .fill(Color.white.opacity(0.08))

                        Capsule()
                            .fill(tint.opacity(0.72))
                            .frame(width: max(6, proxy.size.width * progress))
                    }
                }
                .frame(height: 6)
            }

            if isUnlimited {
                VStack(alignment: .leading, spacing: 5) {
                    HStack(alignment: .firstTextBaseline, spacing: 6) {
                        Text(statusText)
                            .font(.system(size: 10, weight: .bold, design: .rounded))
                            .foregroundStyle(.white)
                            .lineLimit(1)
                            .minimumScaleFactor(0.72)

                        Spacer(minLength: 4)

                        WatchPill(text: "Ilimitado", tone: .blue)
                    }

                    Text(clean(usage.totalLabel) ?? "Sin límite")
                        .font(.system(size: 8, weight: .medium, design: .rounded))
                        .foregroundStyle(.secondary)
                        .lineLimit(1)
                        .minimumScaleFactor(0.68)
                }
                .padding(.top, 2)
            } else {
                HStack(spacing: 4) {
                    Text(statusText)
                        .font(.system(size: 8.5, weight: .semibold, design: .rounded))
                        .foregroundStyle(.white)
                        .lineLimit(1)
                        .minimumScaleFactor(0.68)

                    Spacer(minLength: 4)

                    Text(clean(usage.totalLabel) ?? "")
                        .font(.system(size: 8, weight: .medium, design: .rounded))
                        .foregroundStyle(.secondary)
                        .lineLimit(1)
                        .minimumScaleFactor(0.68)
                }
            }
        }
        .padding(.vertical, 6)
        .padding(.horizontal, 7)
        .background(tint.opacity(0.1), in: RoundedRectangle(cornerRadius: 12, style: .continuous))
    }
}

struct WatchApprovalRowCard: View {
    let approval: WatchApprovalSummary

    private var typeLabel: String {
        let normalizedTypes = (approval.types ?? [])
            .compactMap { clean($0)?.uppercased() }
            .filter { !$0.isEmpty }

        let hasProxy = normalizedTypes.contains("PROXY")
        let hasVpn = normalizedTypes.contains("VPN")

        if hasProxy && hasVpn {
            return "PROXY/VPN"
        }

        if hasProxy {
            return "PROXY"
        }

        if hasVpn {
            return "VPN"
        }

        return normalizedTypes.first ?? "VENTA"
    }

    private var iconName: String {
        switch typeLabel {
        case "PROXY/VPN":
            return "network.badge.shield.half.filled"
        case "PROXY":
            return "network"
        case "VPN":
            return "shield.lefthalf.filled"
        default:
            return "cart.fill"
        }
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 7) {
            HStack(alignment: .top, spacing: 7) {
                ZStack {
                    Circle()
                        .fill(Color.orange.opacity(0.16))
                        .frame(width: 24, height: 24)

                    Image(systemName: iconName)
                        .font(.system(size: 10.5, weight: .semibold))
                        .foregroundStyle(.orange)
                }
                .accessibilityHidden(true)

                VStack(alignment: .leading, spacing: 2) {
                    Text(typeLabel)
                        .font(.system(size: 10.4, weight: .bold, design: .rounded))
                        .foregroundStyle(.white)
                        .lineLimit(1)
                        .minimumScaleFactor(0.78)

                    Text(clean(approval.title) ?? "Venta pendiente")
                        .font(.system(size: 8.4, weight: .medium, design: .rounded))
                        .foregroundStyle(.secondary)
                        .lineLimit(1)
                        .minimumScaleFactor(0.72)
                }
                .layoutPriority(1)

                Spacer(minLength: 4)

                WatchPill(
                    text: approval.canApproveSale == true ? "Lista" : "Pendiente",
                    tone: approval.canApproveSale == true ? .green : .orange
                )
            }

            Text(clean(approval.userDisplayName) ?? "Usuario pendiente")
                .font(.system(size: 9, weight: .medium, design: .rounded))
                .foregroundStyle(.secondary)
                .lineLimit(1)
                .minimumScaleFactor(0.72)

            HStack(spacing: 8) {
                Text(clean(approval.amountLabel) ?? "Sin monto")
                    .font(.system(size: 9.2, weight: .semibold, design: .rounded))
                    .foregroundStyle(.white)
                    .lineLimit(2)
                    .minimumScaleFactor(0.78)

                if let createdAt = formatWatchDate(approval.createdAt) {
                    Text("•")
                        .foregroundStyle(.secondary)

                    Text(createdAt)
                        .font(.system(size: 8.3, weight: .medium, design: .rounded))
                        .foregroundStyle(.secondary)
                        .lineLimit(1)
                        .minimumScaleFactor(0.68)
                }
            }
        }
        .padding(10)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Color.white.opacity(0.05), in: RoundedRectangle(cornerRadius: 16, style: .continuous))
    }
}

struct WatchInfoCard<Content: View>: View {
    let title: String
    @ViewBuilder let content: Content

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            Text(title)
                .font(.system(size: 10, weight: .semibold, design: .rounded))
                .foregroundStyle(.white)
                .lineLimit(1)
                .minimumScaleFactor(0.85)

            content
        }
        .padding(.horizontal, 7)
        .padding(.vertical, 7)
        .frame(maxWidth: .infinity, alignment: .leading)
    }
}

struct WatchContactCard: View {
    let user: WatchUserProfile

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack(spacing: 6) {
                Image(systemName: "person.crop.circle.badge.checkmark")
                    .font(.system(size: 11, weight: .semibold))
                    .foregroundStyle(.cyan)

                Text("Contacto")
                    .font(.system(size: 10.4, weight: .bold, design: .rounded))
                    .foregroundStyle(.white)
                    .lineLimit(1)

                Spacer(minLength: 4)
            }

            VStack(spacing: 6) {
                WatchContactRow(
                    icon: "envelope.fill",
                    label: "Correo",
                    value: clean(user.email) ?? "No disponible",
                    tint: .cyan
                )

                WatchContactRow(
                    icon: "phone.fill",
                    label: "Teléfono",
                    value: clean(user.phone) ?? "No disponible",
                    tint: .green
                )

                WatchContactRow(
                    icon: "shield.lefthalf.filled",
                    label: "Rol",
                    value: clean(user.roleLabel) ?? "Usuario",
                    tint: .purple
                )
            }
        }
        .padding(10)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(
            LinearGradient(
                colors: [
                    Color.cyan.opacity(0.11),
                    Color.white.opacity(0.045)
                ],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            ),
            in: RoundedRectangle(cornerRadius: 16, style: .continuous)
        )
        .overlay(
            RoundedRectangle(cornerRadius: 16, style: .continuous)
                .stroke(Color.cyan.opacity(0.13), lineWidth: 1)
        )
    }
}

private struct WatchContactRow: View {
    let icon: String
    let label: String
    let value: String
    let tint: Color

    var body: some View {
        HStack(alignment: .center, spacing: 7) {
            ZStack {
                RoundedRectangle(cornerRadius: 8, style: .continuous)
                    .fill(tint.opacity(0.14))
                    .frame(width: 24, height: 24)

                Image(systemName: icon)
                    .font(.system(size: 10, weight: .semibold))
                    .foregroundStyle(tint)
            }
            .accessibilityHidden(true)

            VStack(alignment: .leading, spacing: 1) {
                Text(label)
                    .font(.system(size: 8.1, weight: .semibold, design: .rounded))
                    .foregroundStyle(.secondary)
                    .lineLimit(1)

                Text(value)
                    .font(.system(size: 9.8, weight: .bold, design: .rounded))
                    .foregroundStyle(.white)
                    .lineLimit(2)
                    .minimumScaleFactor(0.68)
                    .allowsTightening(true)
            }
            .layoutPriority(1)

            Spacer(minLength: 0)
        }
        .padding(.horizontal, 7)
        .padding(.vertical, 6)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Color.white.opacity(0.045), in: RoundedRectangle(cornerRadius: 12, style: .continuous))
    }
}

struct WatchInfoRow: View {
    let label: String
    let value: String

    var body: some View {
        VStack(alignment: .leading, spacing: 2) {
            Text(label)
                .font(.system(size: 8.3, weight: .medium, design: .rounded))
                .foregroundStyle(.secondary)

            Text(value)
                .font(.system(size: 10, weight: .semibold, design: .rounded))
                .foregroundStyle(.white)
                .lineLimit(2)
                .minimumScaleFactor(0.8)
        }
    }
}

struct WatchUsageMetricCard: View {
    let title: String
    let usage: WatchUsageSnapshot

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            HStack {
                Text(title)
                    .font(.system(size: 9.4, weight: .semibold, design: .rounded))
                    .foregroundStyle(.white)
                    .lineLimit(1)
                    .minimumScaleFactor(0.8)

                Spacer(minLength: 6)

                WatchPill(
                    text: usage.enabled == true ? "Activo" : "Off",
                    tone: usage.enabled == true ? .green : .gray
                )
            }

            ProgressView(value: usage.progress ?? 0)
                .tint(usage.active == true ? .green : .cyan)

            Text(clean(usage.statusLabel) ?? "Sin datos")
                .font(.system(size: 8.4, weight: .medium, design: .rounded))
                .foregroundStyle(.white)
                .minimumScaleFactor(0.8)

            HStack {
                Text(clean(usage.usedLabel) ?? "0 MB")
                    .font(.system(size: 8.3, weight: .medium, design: .rounded))
                    .foregroundStyle(.secondary)

                Spacer(minLength: 6)

                Text(clean(usage.totalLabel) ?? "0 MB")
                    .font(.system(size: 8.3, weight: .medium, design: .rounded))
                    .foregroundStyle(.secondary)
            }
        }
        .padding(8)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Color.white.opacity(0.04), in: RoundedRectangle(cornerRadius: 14, style: .continuous))
    }
}

struct WatchOptionRow: View {
    let user: WatchUserProfile
    let option: WatchOptionSnapshot
    let onToggle: (Bool) -> Void

    private var isVpnDisconnectOption: Bool {
        let normalizedKey = (clean(option.key) ?? "").lowercased()
        let normalizedLabel = (clean(option.label) ?? "").lowercased()

        let referencesVpn = normalizedKey.contains("vpn") || normalizedLabel.contains("vpn")
        let referencesDisconnect =
            normalizedKey.contains("descon") ||
            normalizedKey.contains("disconnect") ||
            normalizedLabel.contains("descon") ||
            normalizedLabel.contains("disconnect")

        return referencesVpn && referencesDisconnect
    }

    private var isVpnDisconnectEnabled: Bool {
        user.usage?.vpn?.enabled == true && user.usage?.vpn?.active == true
    }

    private var isToggleEnabled: Bool {
        guard option.editable == true else {
            return false
        }

        if isVpnDisconnectOption {
            return isVpnDisconnectEnabled
        }

        return true
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            HStack {
                VStack(alignment: .leading, spacing: 2) {
                    Text(clean(option.label) ?? "Opción")
                        .font(.system(size: 9.4, weight: .semibold, design: .rounded))
                        .foregroundStyle(.white)
                        .minimumScaleFactor(0.8)

                    if let description = clean(option.description) {
                        Text(description)
                            .font(.system(size: 8.4, weight: .medium, design: .rounded))
                            .foregroundStyle(.secondary)
                            .lineLimit(2)
                            .minimumScaleFactor(0.8)
                    }
                }

                Spacer(minLength: 8)

                Toggle("", isOn: Binding(
                    get: { option.value ?? false },
                    set: { nextValue in
                        onToggle(nextValue)
                    }
                ))
                .labelsHidden()
                .disabled(!isToggleEnabled)
            }
        }
        .padding(.vertical, 2)
        .frame(maxWidth: .infinity, alignment: .leading)
    }
}

struct WatchStatusBanner: View {
    let text: String

    var body: some View {
        HStack(alignment: .top, spacing: 8) {
            Image(systemName: "info.circle.fill")
                .foregroundStyle(.cyan)

            Text(text)
                .font(.system(size: 9.2, weight: .medium, design: .rounded))
                .foregroundStyle(.white)
                .minimumScaleFactor(0.8)
        }
        .padding(10)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Color.white.opacity(0.06), in: RoundedRectangle(cornerRadius: 16, style: .continuous))
    }
}

struct WatchMetricMini: View {
    let title: String
    let value: String

    var body: some View {
        VStack(alignment: .leading, spacing: 2) {
            Text(title)
                .font(.system(size: 8.3, weight: .medium, design: .rounded))
                .foregroundStyle(.secondary)

            Text(value)
                .font(.system(size: 10, weight: .semibold, design: .rounded))
                .foregroundStyle(.white)
                .lineLimit(3)
                .minimumScaleFactor(0.75)
        }
        .padding(8)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Color.white.opacity(0.06), in: RoundedRectangle(cornerRadius: 14, style: .continuous))
    }
}

struct WatchStatCard: View {
    let icon: String
    let title: String
    let value: String

    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            Image(systemName: icon)
                .foregroundStyle(.cyan)

            Text(title)
                .font(.system(size: 8.3, weight: .medium, design: .rounded))
                .foregroundStyle(.secondary)

            Text(value)
                .font(.system(size: 10, weight: .semibold, design: .rounded))
                .foregroundStyle(.white)
                .lineLimit(1)
                .minimumScaleFactor(0.8)
        }
        .padding(8)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Color.white.opacity(0.06), in: RoundedRectangle(cornerRadius: 14, style: .continuous))
    }
}

struct WatchMiniUsageBadge: View {
    let active: Bool
    let title: String

    var body: some View {
        HStack(spacing: 4) {
            Circle()
                .fill(active ? Color.green : Color.gray.opacity(0.6))
                .frame(width: 6, height: 6)

            Text(title)
                .font(.system(size: 8.3, weight: .medium, design: .rounded))
                .foregroundStyle(.secondary)
                .lineLimit(1)
                .minimumScaleFactor(0.85)
        }
        .padding(.horizontal, 6)
        .padding(.vertical, 3)
        .background(Color.white.opacity(0.06), in: Capsule())
    }
}

struct WatchPill: View {
    enum Tone {
        case blue
        case gray
        case green
        case orange
        case purple
    }

    let text: String
    let tone: Tone

    var body: some View {
        Text(text)
            .font(.system(size: 9.2, weight: .semibold, design: .rounded))
            .foregroundStyle(foregroundColor)
            .lineLimit(1)
            .minimumScaleFactor(0.72)
            .allowsTightening(true)
            .padding(.horizontal, 7)
            .padding(.vertical, 3)
            .background(backgroundColor, in: Capsule())
    }

    private var backgroundColor: Color {
        switch tone {
        case .blue:
            return Color.blue.opacity(0.18)
        case .gray:
            return Color.white.opacity(0.08)
        case .green:
            return Color.green.opacity(0.18)
        case .orange:
            return Color.orange.opacity(0.18)
        case .purple:
            return Color.purple.opacity(0.18)
        }
    }

    private var foregroundColor: Color {
        switch tone {
        case .blue:
            return .cyan
        case .gray:
            return .secondary
        case .green:
            return .green
        case .orange:
            return .orange
        case .purple:
            return .purple
        }
    }
}

struct WatchAvatarView: View {
    let name: String
    let picture: String?
    var size: CGFloat = 42

    var body: some View {
        ZStack {
            Circle()
                .fill(Color.white.opacity(0.08))
                .frame(width: size, height: size)

            if let pictureURL = clean(picture), let url = URL(string: pictureURL) {
                AsyncImage(url: url) { phase in
                    switch phase {
                    case .success(let image):
                        image
                            .resizable()
                            .scaledToFill()
                    default:
                        initialsView
                    }
                }
                .frame(width: size, height: size)
                .clipShape(Circle())
            } else {
                initialsView
            }
        }
    }

    private var initialsView: some View {
        Text(initials(from: name))
            .font(.system(size: size * 0.38, weight: .bold, design: .rounded))
            .foregroundStyle(.cyan)
    }

    private func initials(from name: String) -> String {
        let parts = name
            .split(separator: " ")
            .map(String.init)
            .filter { !$0.isEmpty }

        let initials = parts
            .prefix(2)
            .compactMap { $0.first }
            .map { String($0) }
            .joined()
            .uppercased()

        return initials.isEmpty ? "V" : initials
    }
}